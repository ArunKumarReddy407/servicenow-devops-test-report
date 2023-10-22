const core = require('@actions/core');
const fs = require('fs');
const xml2js = require('xml2js');
const axios = require('axios');

(async function main() {
    let instanceUrl = core.getInput('instance-url', { required: true });
    const toolId = core.getInput('tool-id', { required: true });
    const username = core.getInput('devops-integration-user-name', { required: false });
    const password = core.getInput('devops-integration-user-password', { required: false });
    const devopsIntegrationToken = core.getInput('devops-integration-token', { required: false });
    const jobname = core.getInput('job-name', { required: true });
    const xmlReportFile = core.getInput('xml-report-filename', { required: true });
    
    let githubContext = core.getInput('context-github', { required: true });

    try {
        githubContext = JSON.parse(githubContext);
    } catch (e) {
        core.setFailed(`Exception parsing github context ${e}`);
        return;
    }

    let xmlData, jsonData, testSummaries, packageName;
    let totalTests = 0, passedTests = 0, failedTests = 0, skippedTests = 0, ignoredTests = 0, totalDuration = 0;
    let startTime = '', endTime = '';
    let testType = 'JUnit';
    const assignJUnitValues = function(summaryObj) {
        totalTests = totalTests + parseInt(summaryObj.tests);
        failedTests = failedTests + parseInt(summaryObj.failures);
        ignoredTests = ignoredTests + parseInt(summaryObj.errors);
        skippedTests = skippedTests + parseInt(summaryObj.skipped);
        totalDuration = totalDuration + parseInt(summaryObj.time);
        passedTests = totalTests - (failedTests + ignoredTests + skippedTests);
        packageName = summaryObj.name.replace(/\.[^.]*$/g, '');
};

    try {
        if (fs.statSync(xmlReportFile).isDirectory()) {
            let filenames = fs.readdirSync(xmlReportFile);
            console.log("\nTest Reports directory files:");
            filenames.forEach(file => {
                let filePath = xmlReportFile + '/' + file;
                if (file.endsWith('.xml')) {
                    console.log('Parsing XML file path to prepare summaries payload: ' +filePath);
                    xmlData = fs.readFileSync(filePath, 'utf8');
                    xml2js.parseString(xmlData, (error, result) => {
                        if (error) {
                            throw error;
                        }
                        // 'result' is a JavaScript object
                        // convert it to a JSON string
                        jsonData = JSON.stringify(result, null, 4);
                        let parsedJson = JSON.parse(jsonData);
                        let summaryObj;
                        if(parsedJson?.testsuites){
                            let parsedresponse = parsedJson["testsuites"];
                            for(var i = 0; i < parsedresponse.testsuite.length; i++){
                                summaryObj = parsedresponse.testsuite[i].$;
                                assignJUnitValues(summaryObj);
                            }
                        }
                        else if(parsedJson?.testsuite){
                            let parsedresponse = parsedJson["testsuite"];
                            summaryObj = parsedresponse.$;
                            assignJUnitValues(summaryObj); 
                        }
                        // Unsupported test type for directory support.
                        else{
                            core.setFailed('This test type does not have directory support. Either the file path should include the whole path to the test (.xml) file, or this test type is currently not supported.');
                        }
                    });
                }
            });
        } else {
            xmlData = fs.readFileSync(xmlReportFile, 'utf8');
            //convert xml to json
            xml2js.parseString(xmlData, (err, result) => {
                if (err) {
                    throw err;
                }
                // 'result' is a JavaScript object
                // convert it to a JSON string
                jsonData = JSON.stringify(result, null, 4);
                let parsedJson = JSON.parse(jsonData);
                // Consider TestNG as JUnit.
                if(parsedJson?.['testng-results']){
                    let parsedresponse = parsedJson["testng-results"];
                    let summaryObj = parsedresponse.$;
                    let suitesObj = parsedresponse.suite[0];
                    let suiteObj = suitesObj.$;
                    let startTime = suiteObj["started-at"];
                    let endTime = suiteObj["finished-at"];
                    let package = suitesObj.test[0].class[0].$;
                    packageName = package.name.replace(/\.[^.]*$/g,'');
                        
                    passedTests = parseInt(summaryObj.passed);
                    failedTests = parseInt(summaryObj.failed);
                    skippedTests = parseInt(summaryObj.skipped);
                    ignoredTests = parseInt(summaryObj.ignored);
                    totalTests = parseInt(summaryObj.total);
                    startTime = startTime.replace(/ +\S*$/ig, 'Z');
                    endTime = endTime.replace(/ +\S*$/ig, 'Z');
                    totalDuration = parseInt(suiteObj["duration-ms"]);
                }
                // Process XUnit test format.
                else if(parsedJson?.assemblies){
                    let parsedresponse = parsedJson["assemblies"];
                    passedTests = (parsedresponse?.assembly[0]?.$?.passed) ? parseInt(parsedresponse.assembly[0].$.passed) : 0 ;
                    failedTests = (parsedresponse?.assembly[0]?.$?.failed) ? parseInt(parsedresponse.assembly[0].$.failed): 0 ;
                    skippedTests = (parsedresponse?.assembly[0]?.$?.skipped) ? parseInt(parsedresponse.assembly[0].$.skipped) : 0 ;
                    totalTests = (parsedresponse?.assembly[0]?.$?.total) ? parseInt(parsedresponse.assembly[0].$.total) : 0 ; 
                    ignoredTests = parseInt(totalTests - (failedTests + passedTests + skippedTests));
                    
                    startTime = (parsedresponse?.$?.timestamp) ? parsedresponse.$.timestamp : "";
                    startTime = startTime.replace(/ +\S*$/ig, 'Z');
                    endTime = (parsedresponse?.$?.timestamp) ? parsedresponse.$.timestamp : "";
                    endTime = endTime.replace(/ +\S*$/ig, 'Z');
                    totalDuration = (parsedresponse?.assembly[0]?.$?.time) ? parseInt(parsedresponse.assembly[0].$.time) : 0;
                    packageName = (parsedresponse?.assembly[0]?.$?.name) ? parsedresponse.assembly[0].$.name : xmlReportFile;
                    testType = 'XUnit';
                }
                // Process NUnit test format.
                else if(parsedJson?.['test-run']){
                    let parsedresponse = parsedJson["test-run"]; 
                    passedTests = (parsedresponse?.$?.passed) ? parseInt(parsedresponse.$.passed) : 0;
                    failedTests = (parsedresponse?.$?.failed) ? parseInt(parsedresponse.$.failed) : 0;
                    skippedTests = (parsedresponse?.$?.skipped) ? parseInt(parsedresponse.$.skipped) : 0;
                    totalTests = (parsedresponse?.$?.total) ? parseInt(parsedresponse.$.total) : 0;
                    ignoredTests = parseInt(totalTests - (failedTests + passedTests + skippedTests));
                    startTime = (parsedresponse?.$["start-time"]) ? parsedresponse.$["start-time"] : "";
                    startTime = startTime.replace(/ +\S*$/ig, 'Z');
                    endTime = (parsedresponse?.$["end-time"]) ? parsedresponse.$["end-time"] : "";
                    endTime.replace(/ +\S*$/ig, 'Z');
                    totalDuration = (parsedresponse?.$?.duration) ? parseInt(parsedresponse.$.duration) : 0;
                    packageName = (parsedresponse?.['test-suite'][0]?.$?.name) ? parsedresponse["test-suite"][0].$.name : xmlReportFile;
                    testType = 'NUnit';
                }
                // Process UnitTest (i.e MSTest) test format.
                else if(parsedJson?.TestRun){
                    let parsedresponse = parsedJson["TestRun"]; 
                    passedTests = (parsedresponse?.ResultSummary[0]?.Counters[0]?.$?.passed) ? parseInt(parsedresponse.ResultSummary[0].Counters[0].$.passed) : 0;
                    failedTests = (parsedresponse?.ResultSummary[0]?.Counters[0]?.$?.failed) ? parseInt(parsedresponse.ResultSummary[0].Counters[0].$.failed) : 0;
                    totalTests = (parsedresponse?.ResultSummary[0]?.Counters[0]?.$?.total) ? parseInt(parsedresponse.ResultSummary[0].Counters[0].$.total) : 0;
                    startTime = (parsedresponse?.Times[0]?.$?.start) ? parsedresponse.Times[0].$.start : "";
                    startTime = startTime.replace(/ +\S*$/ig, 'Z');
                    endTime = (parsedresponse?.Times[0]?.$?.finish) ? parsedresponse.Times[0].$.finish : "";
                    endTime.replace(/ +\S*$/ig, 'Z');
                    totalDuration = 0; // #TO-DO: Check if we can do start time - end time.
                    skippedTests = 0; // skipped and ignored tests are not present for MSTest.
                    ignoredTests = 0;
                    packageName = (parsedresponse?.TestDefinitions[0]?.UnitTest[0]?.TestMethod[0]?.$?.className) ? parsedresponse.TestDefinitions[0].UnitTest[0].TestMethod[0].$.className : xmlReportFile;
                    testType = 'UnitTest';
                }
                // Support JUnit via file path as well
                // Process pytest / jest test format.
                else if(parsedJson?.testsuites){
                    let summaryObj;
                    let parsedresponse = parsedJson["testsuites"];
                    for(var i = 0; i < parsedresponse.testsuite.length; i++){
                        summaryObj = parsedresponse.testsuite[i].$;
                        assignJUnitValues(summaryObj);
                    }
                }
                else if(parsedJson?.testsuite){
                    let summaryObj;
                    let parsedresponse = parsedJson["testsuite"];
                    summaryObj = parsedresponse.$;
                    assignJUnitValues(summaryObj); 
                }
                // Unsupported test type.
                else{
                    core.setFailed('This test type is currently not supported.');
                }

            });
        }
    } catch (e) {
        core.setFailed(`Exception parsing and converting xml to json ${e}`);
        return;
    }

    let payload;
    
    try {
        instanceUrl = instanceUrl.trim();
        if (instanceUrl.endsWith('/'))
            instanceUrl = instanceUrl.slice(0, -1);

        testSummaries = [{
            name: packageName + '-' + githubContext.run_number + '.' + githubContext.run_attempt,
            passedTests: passedTests,
            failedTests: failedTests,
            skippedTests: skippedTests,
            ignoredTests: ignoredTests,
            blockedTests: 0,
            totalTests: totalTests,
            startTime: startTime,
            endTime: endTime,
            duration: totalDuration,
            testType: testType,
            suites: []			
        }];
        console.log("test summaries payload is : ", JSON.stringify(testSummaries));
        payload = {
            toolId: toolId,
            buildNumber: githubContext.run_number,
            buildId: githubContext.run_id,
            attemptNumber: githubContext.run_attempt,
            stageName: jobname,
            workflow: `${githubContext.workflow}`,
            repository: `${githubContext.repository}`,
            testSummaries: testSummaries,
            fileContent: '',
            testType: testType
        };
        console.log("original payload is : ", JSON.stringify(payload));
    } catch (e) {
        core.setFailed(`Exception setting the payload ${e}`);
        return;
    }

    let result;
    let snowResponse;
    const endpointV1 = `${instanceUrl}/api/sn_devops/v1/devops/tool/test?toolId=${toolId}&testType=${testType}`;
    const endpointV2 = `${instanceUrl}/api/sn_devops/v2/devops/tool/test?toolId=${toolId}&testType=${testType}`;

    try {
        if (!devopsIntegrationToken && !username && !password) {
            core.setFailed('Either secret token or integration username, password is needed for integration user authentication');
            return;
        } else if (devopsIntegrationToken) {
            const defaultHeadersv2 = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'sn_devops_token': `${devopsIntegrationToken}`
            };
            httpHeaders = {
                headers: defaultHeadersv2
            };
            endpoint = endpointV2;
        } else if (username && password) {
            const token = `${username}:${password}`;
            const encodedToken = Buffer.from(token).toString('base64');
            const defaultHeadersv1 = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + `${encodedToken}`
            };
            httpHeaders = {
                headers: defaultHeadersv1 
            };
            endpoint = endpointV1;
        } else {
            core.setFailed('For Basic Auth, Username and Password is mandatory for integration user authentication');
            return;
        }
        snowResponse = await axios.post(endpoint, JSON.stringify(payload), httpHeaders);
    } catch (e) {
        if (e.message.includes('ECONNREFUSED') || e.message.includes('ENOTFOUND') || e.message.includes('405')) {
            core.setFailed('ServiceNow Instance URL is NOT valid. Please correct the URL and try again.');
        } else if (e.message.includes('401')) {
            core.setFailed('Invalid Credentials. Please correct the credentials and try again.');
        } else {
            core.setFailed(`ServiceNow Test Results are NOT created. Please check ServiceNow logs for more details.`);
        }
    }
    
})();
