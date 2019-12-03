#!/bin/bash

set -ex
# set -o pipefail

update_cache() {
    apt-get update
}

install_k6() {
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys 379CE192D401AB61
    echo "deb https://dl.bintray.com/loadimpact/deb stable main" | sudo tee -a /etc/apt/sources.list
    sudo apt-get update
    sudo apt-get install k6
}

install_aws_cli() {
    apt-get install curl unzip python2.7 python-pip sudo -y
    curl "https://s3.amazonaws.com/aws-cli/awscli-bundle.zip" -o "awscli-bundle.zip"
    unzip awscli-bundle.zip
    ./awscli-bundle/install -b ~/bin/aws

}

configuring_aws() {
    /root/bin/aws configure set aws_access_key_id $AWS_ACCESS_KEY
    /root/bin/aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
    /root/bin/aws configure set default.region us-east-1
    /root/bin/aws configure set default.output json
}

main() {
    update_cache
    install_aws_cli
    configuring_aws
    update_cache
    install_k6
}

main "$@"