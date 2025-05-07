AWS_REGION ?= us-east-1
AWS_ACCOUNT_ID ?= 033156084586
AWS_PROFILE ?= new-efflux
STACK_NAME ?= Efflux-Ad-Inspo-Scraper

deploy-stack:
	@echo "Deploying stack using SAM"
	@sam deploy \
		--no-confirm-changeset \
		--template-file template.yaml \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--resolve-s3 \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
		--parameter-overrides \
			ParameterKey=AWSRegion,ParameterValue=$(AWS_REGION) \
			ParameterKey=AWSAccountId,ParameterValue=$(AWS_ACCOUNT_ID) \
			ParameterKey=AWSProfile,ParameterValue=$(AWS_PROFILE)

dev-live:
	@echo "using SAM Accelerate"
	@sam sync --watch \
		--stack-name $(STACK_NAME) \
		--template template.yaml \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--parameter-overrides \
			ParameterKey=AWSRegion,ParameterValue=$(AWS_REGION) \
			ParameterKey=AWSAccountId,ParameterValue=$(AWS_ACCOUNT_ID) \
			ParameterKey=AWSProfile,ParameterValue=$(AWS_PROFILE)

logs:
	@echo "Getting logs"
	@sam logs \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--tail | spacer --after 2

run-locally:
	@echo "Running locally"
	@sam local start-api \
		--template template.yaml \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--parameter-overrides \
			ParameterKey=AWSRegion,ParameterValue=$(AWS_REGION) \
			ParameterKey=AWSAccountId,ParameterValue=$(AWS_ACCOUNT_ID) \
			ParameterKey=AWSProfile,ParameterValue=$(AWS_PROFILE)

destroy-stack:
	@echo "Destroying stack"
	@aws cloudformation delete-stack \
		--stack-name $(STACK_NAME) \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE)