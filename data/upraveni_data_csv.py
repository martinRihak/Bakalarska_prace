import pandas as pd

# Načtení souboru data.csv
data = pd.read_csv('data.csv')

# Filtrování řádků, kde info je 'SHT20'
sht20_data = data[data['info'] == 'SHT20']

# Nastavení lokace na hodnotu z prvního záznamu
sht20_data['location'] = "48.9757129374215,17.08574914434807"

# Výběr potřebných sloupců
selected_columns = ['name', 'time', 'humidity', 'info', 'location', 'sensor_id', 'temperature']
sht20_selected = sht20_data[selected_columns]

# Uložení do nového souboru
sht20_selected.to_csv('upraveny_data.csv', index=False)