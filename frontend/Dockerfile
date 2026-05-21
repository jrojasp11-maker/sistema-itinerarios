FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js
COPY assets/ /usr/share/nginx/html/assets/
COPY scripts/ /usr/share/nginx/html/scripts/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
