# Refaktoring

## Backend

- Přejmenování: proměnné - snake_case , funkce - snake_case , Třídy - PascalCase , Konstanty UPPER_CASE

- Routes: ze složky routes projdi všechny .py soubory nachazejí se v nich routy. Uprav soubor tak, aby obsahoval pouze routes a pro kazdy soubor vytvor nový soubor ve složce services nezávislou byznis logiku ke routes.
- - Toto je popis routes : Oddělte logiku od routování. routes jen přijmou data, pošlou je do services, a vrátí odpověď. Díky tomu je logika snadno testovatelná bez běžícího serveru.


