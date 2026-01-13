"""Check the full page content and structure"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import fetch_html

url = "https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"
html = fetch_html(url)

# Count how many times "Currency:" appears
currency_count = html.count('Currency:')
print(f"'Currency:' appears {currency_count} times in the HTML")

# Check page size
print(f"HTML size: {len(html):,} bytes ({len(html)/1024:.1f} KB)")

# Look for all country names in headings
import re
countries_pattern = r'<h[1-4][^>]*>([^<]+)\s*-\s*Currency:'
countries = re.findall(countries_pattern, html)
print(f"\nCountries found in headings: {len(countries)}")

if countries:
    print("\nAll countries:")
    for i, country in enumerate(countries, 1):
        print(f"{i:2}. {country.strip()}")

# Check if there's a "show more" or expand mechanism
if 'show all' in html.lower():
    print("\n'show all' found in HTML")
if 'expand' in html.lower():
    print("'expand' found in HTML")
if 'load more' in html.lower():
    print("'load more' found in HTML")
