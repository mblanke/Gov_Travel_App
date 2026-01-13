"""Look for alphabet navigation or hidden content"""
import sys
sys.path.insert(0, 'src')

from gov_travel.scrapers import fetch_html
from bs4 import BeautifulSoup
import re

url = "https://www.njc-cnm.gc.ca/directive/app_d.php?lang=en"
html = fetch_html(url)
soup = BeautifulSoup(html, 'html.parser')

# Look for alphabet links (A-Z navigation)
print("Looking for alphabet navigation...")
alphabet_links = []
for link in soup.find_all('a'):
    text = link.get_text(strip=True)
    href = link.get('href', '')
    # Check if it's a single letter
    if len(text) == 1 and text.isalpha():
        alphabet_links.append((text, href))

if alphabet_links:
    print(f"\nFound {len(alphabet_links)} alphabet links:")
    for letter, href in alphabet_links[:10]:
        print(f"  {letter}: {href}")
else:
    print("No alphabet navigation found")

# Check for JavaScript or AJAX content loading
print("\n" + "="*80)
print("Checking for dynamic content loading...")
scripts = soup.find_all('script')
print(f"Script tags found: {len(scripts)}")

ajax_indicators = ['ajax', 'xhr', 'fetch', 'loadmore', 'getjson']
for script in scripts:
    script_text = script.get_text().lower()
    for indicator in ajax_indicators:
        if indicator in script_text:
            print(f"  Found '{indicator}' in script")
            break

# Look for hidden content
print("\n" + "="*80)
print("Looking for collapsed/hidden sections...")
hidden = soup.find_all(attrs={'style': re.compile(r'display:\s*none')})
print(f"Hidden elements: {len(hidden)}")

collapsed = soup.find_all(class_=re.compile(r'collaps'))
print(f"Collapsible elements: {len(collapsed)}")

# Check the main content area
print("\n" + "="*80)
print("Checking if there's a note about alphabetical display...")
page_text = soup.get_text()
if 'alphabetical' in page_text.lower():
    # Find context around "alphabetical"
    idx = page_text.lower().find('alphabetical')
    context = page_text[max(0, idx-100):idx+100]
    print(f"Found 'alphabetical' in text: ...{context}...")
