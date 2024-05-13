## How to deploy a Bastion instance? (only do all the steps if it doesn't already exist, otherwise skip to nr 3 and add your public key there)
1. Go to EC2, launch a new instance
2. Configure the instance options
  - Choose an Amazon Linux image
  - choose no key pair
  - choose the correct VPC and a public subnet
  - Use "Bastion sg" security group
  - Under "Advanced Details" set the IAM Instance Profile to be BastionRole
3. When the instance is running, connect to it using Session Manager
4. Edit the authorized keys file for ec2-user and add your public key there (`sudo nano /home/ec2-user/.ssh/authorized_keys`). This allows you to SSH into it.

## How to setup AWS Session Manager on your machine?
1. Run `brew install homebrew/cask/session-manager-plugin`
2. Edit your `.ssh/config` and add the following
```
Host i-* mi-*
  ProxyCommand sh -c "aws —-profile default ssm start-session -—target %h —document-name AWS-StartSSHSession -—parameters 'portNumber=%p'"
```
3. Test that you're able to connect ssh ec2-user@INSTANCE_ID, where INSTANCE_ID is the EC2 instance ID, e.g. i-0b82cdc4003475361


## How to create a tunnel to timescale?
1. Setup the tunnel using `ssh -N -L 5432:TIMESCALE_HOST:5432 ec2-user@INSTANCE_ID`  (host is retrievable from timescale website or secrets in AWS)
2. Now you can connect to it using `localhost:5432`

## How to run migrations?
- Create a copy of `.env.example` called `.env` and fill the necessary secrets.
- `npm ci`
- Use `npm run create-new-migration <migration-name>` to create a new migration executable.
- Use `npm run migrate` to call the executable.
  - `npm run migrate up` - run migrations
  - `npm run migrate down` - rollback migrations
  - `npm run migrate create name` - create new migration
- Use `npm run dry-run` to test what will happen and only print the SQL
  - `npm run dry-run up`
  - `npm run dry-run down`

See the available commands [here](https://salsita.github.io/node-pg-migrate/#/cli)
