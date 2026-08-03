import json
import os
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = os.getenv("AUDIT_BASE_URL", "http://localhost:3000").rstrip("/")
ARTIFACT_DIR = Path(os.getenv("AUDIT_ARTIFACT_DIR", "artifacts"))
ROUTES = ["/login", "/dashboard", "/report-attendances", "/analytics", "/consultations/1"]
RUNS = max(1, int(os.getenv("AUDIT_RUNS", "3")))
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "android": {"width": 412, "height": 915},
}


def measure(browser, viewport_name, viewport, route):
    context = browser.new_context(
        viewport=viewport,
        service_workers="block",
        extra_http_headers={"x-forwarded-proto": "https"},
    )
    page = context.new_page()
    requests = {}
    responses = []

    page.add_init_script(
        """
        (() => {
          window.__auditLongTasks = [];
          window.__auditLcp = 0;
          window.__auditCls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__auditLongTasks.push(entry.duration);
          }).observe({type: 'longtask', buffered: true});
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__auditLcp = entry.startTime;
          }).observe({type: 'largest-contentful-paint', buffered: true});
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) window.__auditCls += entry.value;
            }
          }).observe({type: 'layout-shift', buffered: true});
        })();
        """
    )

    def on_request(request):
        requests[id(request)] = time.perf_counter()

    def on_response(response):
        started = requests.get(id(response.request))
        elapsed_ms = round((time.perf_counter() - started) * 1000, 1) if started else None
        responses.append(
            {
                "url": response.url,
                "status": response.status,
                "type": response.request.resource_type,
                "elapsed_ms": elapsed_ms,
            }
        )

    page.on("request", on_request)
    page.on("response", on_response)
    started = time.perf_counter()
    page.goto(f"{BASE_URL}{route}", wait_until="domcontentloaded", timeout=30000)
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(1500)
    wall_ms = round((time.perf_counter() - started) * 1000, 1)

    metrics = page.evaluate(
        """
        () => {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          return {
            url: location.href,
            navigation: nav ? {
              ttfb_ms: Math.round(nav.responseStart),
              dom_interactive_ms: Math.round(nav.domInteractive),
              dom_content_loaded_ms: Math.round(nav.domContentLoadedEventEnd),
              load_event_ms: Math.round(nav.loadEventEnd),
            } : null,
            transfer_bytes: resources.reduce((sum, item) => sum + (item.transferSize || 0), 0),
            resource_count: resources.length,
            top_resources: resources
              .map((item) => ({
                name: item.name,
                transfer_bytes: item.transferSize || 0,
                encoded_bytes: item.encodedBodySize || 0,
                duration_ms: Math.round(item.duration),
              }))
              .sort((a, b) => b.transfer_bytes - a.transfer_bytes)
              .slice(0, 12),
            long_tasks: window.__auditLongTasks || [],
            lcp_ms: Math.round(window.__auditLcp || 0),
            cls: Number((window.__auditCls || 0).toFixed(4)),
          };
        }
        """
    )
    metrics.update(
        {
            "viewport": viewport_name,
            "route": route,
            "wall_ms": wall_ms,
            "api_requests": [
                item for item in responses if "/api/" in item["url"] or "/sanctum/" in item["url"]
            ],
            "http_5xx": [item for item in responses if item["status"] >= 500],
        }
    )
    context.close()
    return metrics


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for viewport_name, viewport in VIEWPORTS.items():
                for route in ROUTES:
                    for run in range(1, RUNS + 1):
                        result = measure(browser, viewport_name, viewport, route)
                        result["run"] = run
                        results.append(result)
                        print(json.dumps(result, ensure_ascii=True))
        finally:
            browser.close()

    output = ARTIFACT_DIR / "performance-audit.json"
    output.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"performance audit complete: {len(results)} measurements -> {output}")


if __name__ == "__main__":
    main()
