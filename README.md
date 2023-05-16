# ServiceNow DevOps Register Unit Test Summary GitHub Action

This custom action needs to be added at step level in a job to register unit test summary details in ServiceNow.

# Usage
## Step 1: Prepare values for setting up your secrets for Actions
- credentials (Devops integration token of a GitHub tool created in ServiceNow DevOps or username and password for a ServiceNow devops integration user)
- instance URL for your ServiceNow dev, test, prod, etc. environments
- tool_id of your GitHub tool created in ServiceNow DevOps, required for token based authentication

## Step 2: Configure Secrets in your GitHub Ogranization or GitHub repository
On GitHub, go in your organization settings or repository settings, click on the _Secrets > Actions_ and create a new secret.

For token based authentication which is available from v1.39.0, create secrets called
- `SN_INSTANCE_URL` your ServiceNow instance URL, for example **https://test.service-now.com**
- `SN_DEVOPS_INTEGRATION_TOKEN` required for token based authentication
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance,required for token based authentication
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance

For basic authentication , create secrets called 
- `SN_INSTANCE_URL` your ServiceNow instance URL, for example **https://test.service-now.com**
- `SN_DEVOPS_USER`
- `SN_DEVOPS_PASSWORD`
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance

## Step 3: Configure the GitHub Action if need to adapt for your needs or workflows
# For Token based Authentication which is available from v1.39.0 , at ServiceNow instance
```yaml
build:
    name: Build
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow DevOps Unit Test Results
        uses: ServiceNow/servicenow-devops-test-report@v1.39.0
        with:
          devops-integration-token: ${{ secrets.SN_DEVOPS_INTEGRATION_TOKEN }}
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          tool-id: ${{ secrets.SN_ORCHESTRATION_TOOL_ID }}
          context-github: ${{ toJSON(github) }}
          job-name: 'Build'
          xml-report-filename: target/surefire-reports/testng-results.xml
```
## For Basic Authentication at ServiceNow instance
```yaml
build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - name: ServiceNow DevOps Unit Test Results
        uses: ServiceNow/servicenow-devops-test-report@v1.34.2
        with:
          devops-integration-user-name: ${{ secrets.SN_DEVOPS_USER }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_PASSWORD }}
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          tool-id: ${{ secrets.SN_ORCHESTRATION_TOOL_ID }}
          context-github: ${{ toJSON(github) }}
          job-name: 'Build'
          xml-report-filename: target/surefire-reports/testng-results.xml
         
```
The values for secrets should be setup in Step 1. Secrets should be created in Step 2.
The Step Name should be **ServiceNow DevOps Unit Test Results**.

## Inputs
### `devops-integration-token`

**Optional**  DevOps Integration Token of GitHub tool created in ServiceNow instance for token based authentication. 

### `devops-integration-user-name`

**Optional**  DevOps Integration Username to ServiceNow instance.  

### `devops-integration-user-password`

**Optional**  DevOps Integration User Password to ServiceNow instance. 

### `instance-url`

**Required**  URL of ServiceNow instance to register the unit test summary details in ServiceNow, for example _https://test.service-now.com_.

### `tool-id`

**Required**  Orchestration Tool Id for GitHub created in ServiceNow DevOps.

### `context-github`

**Required**  Github context contains information about the workflow run details.

### `job-name`

**Required**  Display name of the job given for attribute _name_ in which _steps_ have been added for this custom action. For example, if display name of job is _Build_ then job-name value must be _'Build'_

### `xml-report-filename`

**Required**  The consolidated xml summary report file generated by TestNG framework or directory that contains XML files generated by JUnit framework. The path to directory or xml summary report file should be relative to workspace. The possible values are _target/surefire-reports/testng-results.xml_ for TestNG, _target/surefire-reports/_ for JUnit, _target/surefire-reports/junitreports/_ for JUnit when both TestNG and JUnit used in the project specific pom.xml.

## Outputs
No outputs produced.

# Notices

## Support Model

ServiceNow customers may request support through the [Now Support (HI) portal](https://support.servicenow.com/nav_to.do?uri=%2Fnow_support_home.do).

## Governance Model

Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers.
