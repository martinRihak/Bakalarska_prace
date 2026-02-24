# Použijeme rovnou lehký Nginx
FROM nginx:1.25-alpine

# Kopírujeme tvoji Nginx konfiguraci
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Kopírujeme TVŮJ LOKÁLNÍ build přímo do kontejneru
# (Předpokládám, že tvoje složka s buildem se jmenuje 'dist')
COPY ./dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]


