import re

def _extract_currency_from_title(title):
    """Extract currency code from table title like 'Albania - Currency: Euro (EUR)'"""
    if not title:
        return None
    # Pattern: "Currency: [Name] ([CODE])"
    match = re.search(r"Currency:\s*[^(]+\(([A-Z]{3})\)", title)
    if match:
        return match.group(1)
    return None

# Test cases
test_titles = [
    "Argentina - Currency: Argentine Peso (ARS)",
    "Albania - Currency: Euro (EUR)",
    "Afghanistan - Currency: US Dollar (USD)",
    "Canada - Currency: Canadian Dollar (CAD)",
    None,
    "Some random text"
]

for title in test_titles:
    result = _extract_currency_from_title(title)
    print(f"{title!r} -> {result}")
