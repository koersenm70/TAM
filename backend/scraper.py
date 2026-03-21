import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from typing import Optional


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

EMAIL_REGEX = re.compile(
    r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,7}\b"
)
PHONE_REGEX = re.compile(
    r"(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)"
    r"|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)"
    r"?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})"
    r"|(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}"
)

SKIP_EMAIL_DOMAINS = {
    "example.com", "test.com", "domain.com", "email.com",
    "yourdomain.com", "sentry.io", "wixpress.com"
}


def fetch_page(url: str, timeout: int = 10) -> Optional[BeautifulSoup]:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except Exception:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
            return BeautifulSoup(resp.text, "html.parser")
        except Exception:
            return None


def extract_emails(soup: BeautifulSoup, page_text: str) -> list[str]:
    emails = set()
    # From mailto links
    for tag in soup.find_all("a", href=True):
        href = tag["href"]
        if href.startswith("mailto:"):
            email = href[7:].split("?")[0].strip()
            if email:
                emails.add(email.lower())
    # From page text
    for match in EMAIL_REGEX.finditer(page_text):
        email = match.group().lower()
        domain = email.split("@")[-1]
        if domain not in SKIP_EMAIL_DOMAINS and not email.endswith((".png", ".jpg", ".gif")):
            emails.add(email)
    return list(emails)


def extract_phones(page_text: str) -> list[str]:
    phones = set()
    for match in PHONE_REGEX.finditer(page_text):
        phone = match.group().strip()
        if len(re.sub(r"\D", "", phone)) >= 7:
            phones.add(phone)
    return list(phones)


def extract_company_name(soup: BeautifulSoup, url: str) -> Optional[str]:
    # Try OG site name
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        return og_site["content"].strip()
    # Try title tag
    title = soup.find("title")
    if title and title.text:
        name = title.text.strip().split("|")[0].split("-")[0].strip()
        if name:
            return name
    # Fallback: domain name
    domain = urlparse(url).netloc.replace("www.", "")
    return domain.split(".")[0].title() if domain else None


def extract_social_links(soup: BeautifulSoup) -> dict:
    socials = {}
    patterns = {
        "linkedin": r"linkedin\.com/(?:company|in)/[\w\-]+",
        "twitter": r"twitter\.com/[\w]+",
        "facebook": r"facebook\.com/[\w\-\.]+",
    }
    for tag in soup.find_all("a", href=True):
        href = tag["href"]
        for platform, pattern in patterns.items():
            if platform not in socials and re.search(pattern, href, re.IGNORECASE):
                socials[platform] = href
    return socials


def scrape_url(url: str, config: dict) -> list[dict]:
    """Scrape a single URL and return extracted lead data."""
    leads = []

    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    soup = fetch_page(url)
    if not soup:
        return leads

    page_text = soup.get_text(separator=" ", strip=True)

    emails = extract_emails(soup, page_text) if config.get("extract_emails", True) else []
    phones = extract_phones(page_text) if config.get("extract_phones", True) else []
    company_name = extract_company_name(soup, url) if config.get("extract_company_name", True) else None
    socials = extract_social_links(soup)

    # Apply custom CSS selectors if provided
    custom = config.get("custom_selectors", {}) or {}
    custom_data = {}
    for field, selector in custom.items():
        el = soup.select_one(selector)
        custom_data[field] = el.get_text(strip=True) if el else None

    if emails:
        for email in emails:
            leads.append({
                "company_name": company_name,
                "email": email,
                "phone": phones[0] if phones else None,
                "website": url,
                "linkedin_url": socials.get("linkedin"),
                "source": "web_scrape",
                "status": "new",
                "custom_fields": custom_data if custom_data else None,
            })
    elif company_name or phones:
        leads.append({
            "company_name": company_name,
            "email": None,
            "phone": phones[0] if phones else None,
            "website": url,
            "linkedin_url": socials.get("linkedin"),
            "source": "web_scrape",
            "status": "new",
            "custom_fields": custom_data if custom_data else None,
        })

    # Follow internal links if configured
    if config.get("follow_links") and config.get("max_pages", 1) > 1:
        base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        visited = {url}
        queue = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            full = urljoin(base, href)
            if full.startswith(base) and full not in visited:
                queue.append(full)

        for link in queue[: config["max_pages"] - 1]:
            visited.add(link)
            sub_leads = scrape_url(link, {**config, "follow_links": False})
            leads.extend(sub_leads)

    return leads
