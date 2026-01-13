import sqlite3

conn = sqlite3.connect('data/travel_rates_scraped.sqlite3')
cursor = conn.cursor()

countries = ['Latvia', 'Germany', 'Dominican Republic', 'Brazil', 'Australia']

for country in countries:
    print(f"\n{'='*80}")
    print(f"{country.upper()}")
    print(f"{'='*80}")
    
    # Get all cities for this country
    cursor.execute("""
        SELECT DISTINCT city, currency
        FROM rate_entries
        WHERE country = ? AND city IS NOT NULL
        ORDER BY city
    """, (country,))
    
    cities = cursor.fetchall()
    
    if not cities:
        print(f"No cities found for {country}")
        continue
    
    for city_name, currency in cities:
        print(f"\n📍 {city_name} ({currency})")
        print("-" * 80)
        
        # Get meal rates for this city
        cursor.execute("""
            SELECT rate_type, rate_amount
            FROM rate_entries
            WHERE country = ? AND city = ? AND rate_type IN 
                ('breakfast', 'lunch', 'dinner', 'incidental amount')
            ORDER BY CASE 
                WHEN rate_type = 'breakfast' THEN 1
                WHEN rate_type = 'lunch' THEN 2
                WHEN rate_type = 'dinner' THEN 3
                WHEN rate_type = 'incidental amount' THEN 4
            END
        """, (country, city_name))
        
        rates = cursor.fetchall()
        if rates:
            for rate_type, amount in rates:
                # Format the display
                type_display = rate_type.replace('incidental amount', 'Incidentals').title()
                print(f"  {type_display:.<25} ${amount:>8.2f} {currency}")
        else:
            print("  No rate details found")

conn.close()
