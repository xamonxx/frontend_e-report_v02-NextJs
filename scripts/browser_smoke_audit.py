import os
import re
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


BASE_URL = os.getenv("AUDIT_BASE_URL", "http://localhost:3000").rstrip("/")
EMAIL = os.getenv("AUDIT_EMAIL")
PASSWORD = os.getenv("AUDIT_PASSWORD")
ARTIFACT_DIR = Path(os.getenv("AUDIT_ARTIFACT_DIR", "artifacts"))


def run_viewport(browser, name, width, height):
    page = browser.new_page(viewport={"width": width, "height": height})
    console_errors = []
    request_failures = []
    server_errors = []
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error" and "401 (Unauthorized)" not in message.text
        else None,
    )
    page.on(
        "requestfailed",
        lambda request: request_failures.append(request.url)
        if request.failure != "net::ERR_ABORTED"
        else None,
    )
    page.on("response", lambda response: server_errors.append(response.url) if response.status >= 500 else None)

    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
    page.wait_for_timeout(2500)
    page.screenshot(path=str(ARTIFACT_DIR / f"{name}-initial.png"), full_page=True)

    if EMAIL and PASSWORD:
        if page.url.endswith("/login"):
            page.locator('input[type="email"]').fill(EMAIL)
            page.locator('input[type="password"]').fill(PASSWORD)
            page.get_by_role("button", name=re.compile("Masuk ke E-Report")).click()
            page.wait_for_url(re.compile(r"/dashboard$"), timeout=15000)

        notification_button = page.get_by_role("button", name=re.compile("Notifikasi"))
        notification_button.click()
        popover = page.locator('[data-slot="popover-content"]')
        popover.wait_for(state="visible")
        first_box = popover.bounding_box()

        tabs = page.get_by_role("tab")
        if tabs.count() < 4:
            raise AssertionError(f"tab notifikasi tidak lengkap pada viewport {name}: {tabs.count()}")
        for _ in range(4):
            for index in range(tabs.count()):
                tabs.nth(index).click()
                page.wait_for_timeout(100)

        last_box = popover.bounding_box()
        if first_box and last_box:
            if abs(first_box["width"] - last_box["width"]) > 1 or abs(first_box["height"] - last_box["height"]) > 1:
                raise AssertionError(f"notification popover berubah ukuran saat switch tab: {first_box} -> {last_box}")

        overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
        if overflow:
            raise AssertionError(f"horizontal overflow pada viewport {name}")

        page.screenshot(path=str(ARTIFACT_DIR / f"{name}-notifications.png"), full_page=True)
    elif not page.url.endswith("/login"):
        raise AssertionError(f"protected route tidak mengarah ke login: {page.url}")

    if console_errors or request_failures or server_errors:
        raise AssertionError(
            f"browser errors pada {name}: console={len(console_errors)}, "
            f"request_failed={len(request_failures)}, http_5xx={len(server_errors)}"
        )

    page.close()


def main():
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    authenticated = bool(EMAIL and PASSWORD)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            run_viewport(browser, "desktop", 1440, 900)
            run_viewport(browser, "android", 412, 915)
        except PlaywrightTimeoutError as error:
            raise SystemExit(f"browser smoke timeout: {error}") from error
        finally:
            browser.close()
    if authenticated:
        print("browser smoke passed: authenticated notification tabs, layout stability, console, and HTTP 5xx")
    else:
        print("browser smoke passed: protected-route redirect, console, and HTTP 5xx")


if __name__ == "__main__":
    main()
