"""Check what's on the NJC international page"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import fetch_html
from bs4 import BeautifulSoup

url = "https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"
print(f"Fetching: {url}\n")

html = fetch_html(url)
soup = BeautifulSoup(html, 'html.parser')

# Count tables
tables = soup.find_all('table')
print(f"Total tables found: {len(tables)}")

# Find all headings before tables (country names)
countries = set()
for table in tables:
    heading = table.find_previous(['h1', 'h2', 'h3', 'h4'])
    if heading:
        text = heading.get_text(strip=True)
        # Extract country name (before " - Currency:")
        if ' - Currency:' in text:
            country = text.split(' - Currency:')[0].strip()
            countries.add(country)

print(f"\nUnique countries found: {len(countries)}")
print("\nFirst 20 countries:")
for i, country in enumerate(sorted(countries)[:20], 1):
    print(f"{i:2}. {country}")

if len(countries) > 20:
    print(f"\n... and {len(countries) - 20} more")
