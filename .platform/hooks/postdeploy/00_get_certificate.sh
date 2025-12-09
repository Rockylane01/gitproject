#!/usr/bin/env bash
# .platform/hooks/postdeploy/00_get_certificate.sh
sudo certbot -n -d 2-13Project3.us-east-2.elasticbeanstalk.com --nginx --agree-tos --email rockylane01@gmail.com