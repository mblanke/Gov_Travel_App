"""Check for pagination or full country list on NJC page"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import fetch_html
from bs4 import BeautifulSoup

url = "https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"
html = fetch_html(url)
soup = BeautifulSoup(html, 'html.parser')

# Look for links or navigation
print("Looking for navigation elements...")
print("\nAll links on the page:")
links = soup.find_all('a')
for link in links[:20]:  # First 20
    href = link.get('href', '')
    text = link.get_text(strip=True)
    if text:
        print(f"  {text}: {href}")

print("\n" + "="*80)
print("Looking for select/dropdown elements (country selector):")
selects = soup.find_all('select')
for select in selects:
    name = select.get('name', 'unnamed')
    print(f"\nSelect field: {name}")
    options = select.find_all('option')
    print(f"  Options count: {len(options)}")
    if len(options) > 0:
        print(f"  First 10 options:")
        for opt in options[:10]:
            value = opt.get('value', '')
            text = opt.get_text(strip=True)
            print(f"    {text} ({value})")
        if len(options) > 10:
            print(f"    ... and {len(options) - 10} more")

print("\n" + "="*80)
print("Looking for forms:")
forms = soup.find_all('form')
print(f"Forms found: {len(forms)}")
for form in forms:
    print(f"  Action: {form.get('action', 'N/A')}")
    print(f"  Method: {form.get('method', 'GET')}")
