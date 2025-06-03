# setup node tools
as sudoer user, follow steps below

## install node and npm (using nvm)
ref: https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-22-04#option-3-installing-node-using-the-node-version-manager

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install v22.16.0
```

## install pm2
ref: https://stackoverflow.com/a/38185684/1232015

```bash
npm i -g pm2
```

## run app
```bash
cd ~/billing-engine
pm2 start --name 'billing' src/index.js --watch
```
you can access through http://{ipaddr}:3000/swagger

## configure nginx for a domain
```bash
sudo nano /etc/nginx/sites-available/billing-demo.conf
sudo ln -s /etc/nginx/sites-available/billing-demo.conf /etc/nginx/sites-enabled/
sudo service nginx reload
```

## setup certbot
ref: https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-22-04#step-1-installing-certbot

```bash
sudo snap install core; sudo snap refresh core
sudo apt remove certbot
sudo snap install --classic certbot
```

## get ssl for a domain
```bash
sudo certbot --nginx -d billing-demo.veryresto.com
```
