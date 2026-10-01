# SCRUM-52 — ZAP active scan (test environment)

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 0 |
| Low | 2 |
| Informational | 3 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of responses with status code 2xx | 56 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of responses with status code 4xx | 43 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of endpoints with content type application/json | 100 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of endpoints with method GET | 53 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of endpoints with method POST | 43 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of endpoints with method PUT | 3 % |
| Info | Informational | https://test.34.121.51.151.nip.io | Count of total endpoints | 32    |
| Info | Informational | https://test.34.121.51.151.nip.io | Percentage of slow responses | 51 % |







## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| Cross Site Scripting Weakness (Persistent in JSON Response) | Low | 7 |
| Server Leaks Version Information via "Server" HTTP Response Header Field | Low | Systemic |
| Authentication Request Identified | Informational | 1 |
| Re-examine Cache-control Directives | Informational | Systemic |
| Session Management Response Identified | Informational | 1 |




## Alert Detail



### [ Cross Site Scripting Weakness (Persistent in JSON Response) ](https://www.zaproxy.org/docs/alerts/40014/)



##### Low (Low)

### Description

A XSS attack was found in a JSON response, this might leave content consumers vulnerable to attack if they don't appropriately handle the data (response).

* URL: https://test.34.121.51.151.nip.io/api/marketing/items%3Fsearch=zap&limit=10
  * Node Name: `https://test.34.121.51.151.nip.io/api/marketing/items (limit,search)`
  * Method: `GET`
  * Parameter: `content`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/marketing/items%3Fsearch=zap&limit=10
  * Node Name: `https://test.34.121.51.151.nip.io/api/marketing/items (limit,search)`
  * Method: `GET`
  * Parameter: `title`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/projects/1/progress
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1/progress`
  * Method: `GET`
  * Parameter: `details`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/projects/1/progress
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1/progress`
  * Method: `GET`
  * Parameter: `title`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/projects/1/tasks
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1/tasks`
  * Method: `GET`
  * Parameter: `descripcion`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/projects/1/tasks
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1/tasks`
  * Method: `GET`
  * Parameter: `nombre`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`
* URL: https://test.34.121.51.151.nip.io/api/reports
  * Node Name: `https://test.34.121.51.151.nip.io/api/reports`
  * Method: `GET`
  * Parameter: `titulo`
  * Attack: `<script>alert(1);</script>`
  * Evidence: ``
  * Other Info: `Raised with LOW confidence as the Content-Type is not HTML.`


Instances: 7

### Solution

Phase: Architecture and Design
Use a vetted library or framework that does not allow this weakness to occur or provides constructs that make this weakness easier to avoid.
Examples of libraries and frameworks that make it easier to generate properly encoded output include Microsoft's Anti-XSS library, the OWASP ESAPI Encoding module, and Apache Wicket.

Phases: Implementation; Architecture and Design
Understand the context in which your data will be used and the encoding that will be expected. This is especially important when transmitting data between different components, or when generating outputs that can contain multiple encodings at the same time, such as web pages or multi-part mail messages. Study all expected communication protocols and data representations to determine the required encoding strategies.
For any data that will be output to another web page, especially any data that was received from external inputs, use the appropriate encoding on all non-alphanumeric characters.
Consult the XSS Prevention Cheat Sheet for more details on the types of encoding and escaping that are needed.

Phase: Architecture and Design
For any security checks that are performed on the client side, ensure that these checks are duplicated on the server side, in order to avoid CWE-602. Attackers can bypass the client-side checks by modifying values after the checks have been performed, or by changing the client to remove the client-side checks entirely. Then, these modified values would be submitted to the server.

If available, use structured mechanisms that automatically enforce the separation between data and code. These mechanisms may be able to provide the relevant quoting, encoding, and validation automatically, instead of relying on the developer to provide this capability at every point where output is generated.

Phase: Implementation
For every web page that is generated, use and specify a character encoding such as ISO-8859-1 or UTF-8. When an encoding is not specified, the web browser may choose a different encoding by guessing which encoding is actually being used by the web page. This can cause the web browser to treat certain sequences as special, opening up the client to subtle XSS attacks. See CWE-116 for more mitigations related to encoding/escaping.

To help mitigate XSS attacks against the user's session cookie, set the session cookie to be HttpOnly. In browsers that support the HttpOnly feature (such as more recent versions of Internet Explorer and Firefox), this attribute can prevent the user's session cookie from being accessible to malicious client-side scripts that use document.cookie. This is not a complete solution, since HttpOnly is not supported by all browsers. More importantly, XMLHTTPRequest and other powerful browser technologies provide read access to HTTP headers, including the Set-Cookie header in which the HttpOnly flag is set.

Assume all input is malicious. Use an "accept known good" input validation strategy, i.e., use an allow list of acceptable inputs that strictly conform to specifications. Reject any input that does not strictly conform to specifications, or transform it into something that does. Do not rely exclusively on looking for malicious or malformed inputs (i.e., do not rely on a deny list). However, deny lists can be useful for detecting potential attacks or determining which inputs are so malformed that they should be rejected outright.

When performing input validation, consider all potentially relevant properties, including length, type of input, the full range of acceptable values, missing or extra inputs, syntax, consistency across related fields, and conformance to business rules. As an example of business rule logic, "boat" may be syntactically valid because it only contains alphanumeric characters, but it is not valid if you are expecting colors such as "red" or "blue."

Ensure that you perform input validation at well-defined interfaces within the application. This will help protect the application even if a component is reused or moved elsewhere.
	

### Reference


* [ https://owasp.org/www-community/attacks/xss/ ](https://owasp.org/www-community/attacks/xss/)
* [ https://cwe.mitre.org/data/definitions/79.html ](https://cwe.mitre.org/data/definitions/79.html)


#### CWE Id: [ 79 ](https://cwe.mitre.org/data/definitions/79.html)


#### WASC Id: 8

#### Source ID: 1

### [ Server Leaks Version Information via "Server" HTTP Response Header Field ](https://www.zaproxy.org/docs/alerts/10036/)



##### Low (High)

### Description

The web/application server is leaking version information via the "Server" HTTP response header. Access to such information may facilitate attackers identifying other vulnerabilities your web/application server is subject to.

* URL: https://test.34.121.51.151.nip.io/api/auth/me
  * Node Name: `https://test.34.121.51.151.nip.io/api/auth/me`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.6`
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/products/1
  * Node Name: `https://test.34.121.51.151.nip.io/api/products/1`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.6`
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/projects%3Fid_empresa=1
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects (id_empresa)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.6`
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/projects/1
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.6`
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/users/6
  * Node Name: `https://test.34.121.51.151.nip.io/api/users/6`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `nginx/1.31.6`
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that your web server, application server, load balancer, etc. is configured to suppress the "Server" header or provide generic details.

### Reference


* [ https://httpd.apache.org/docs/current/mod/core.html#servertokens ](https://httpd.apache.org/docs/current/mod/core.html#servertokens)
* [ https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10) ](https://learn.microsoft.com/en-us/previous-versions/msp-n-p/ff648552(v=pandp.10))
* [ https://www.troyhunt.com/shhh-dont-let-your-response-headers/ ](https://www.troyhunt.com/shhh-dont-let-your-response-headers/)


#### CWE Id: [ 497 ](https://cwe.mitre.org/data/definitions/497.html)


#### WASC Id: 13

#### Source ID: 3

### [ Authentication Request Identified ](https://www.zaproxy.org/docs/alerts/10111/)



##### Informational (High)

### Description

The given request has been identified as an authentication request. The 'Other Info' field contains a set of key=value lines which identify any relevant fields. If the request is in a context which has an Authentication Method set to "Auto-Detect" then this rule will change the authentication to match the request identified.

* URL: https://test.34.121.51.151.nip.io/api/auth/login
  * Node Name: `https://test.34.121.51.151.nip.io/api/auth/login ()({email,password})`
  * Method: `POST`
  * Parameter: `email`
  * Attack: ``
  * Evidence: `password`
  * Other Info: `userParam=email
userValue=zap-probe@kontrol-test.dev
passwordParam=password`


Instances: 1

### Solution

This is an informational alert rather than a vulnerability and so there is nothing to fix.

### Reference


* [ https://www.zaproxy.org/docs/desktop/addons/authentication-helper/auth-req-id/ ](https://www.zaproxy.org/docs/desktop/addons/authentication-helper/auth-req-id/)



#### Source ID: 3

### [ Re-examine Cache-control Directives ](https://www.zaproxy.org/docs/alerts/10015/)



##### Informational (Low)

### Description

The cache-control header has not been set properly or is missing, allowing the browser and proxies to cache content. For static assets like css, js, or image files this might be intended, however, the resources should be reviewed to ensure that no sensitive content will be cached.

* URL: https://test.34.121.51.151.nip.io/api/auth/me
  * Node Name: `https://test.34.121.51.151.nip.io/api/auth/me`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/projects%3Fid_empresa=1
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects (id_empresa)`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/projects/1
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/projects/1/tasks/1
  * Node Name: `https://test.34.121.51.151.nip.io/api/projects/1/tasks/1`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: https://test.34.121.51.151.nip.io/api/reports/1
  * Node Name: `https://test.34.121.51.151.nip.io/api/reports/1`
  * Method: `GET`
  * Parameter: `cache-control`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``

Instances: Systemic


### Solution

For secure content, ensure the cache-control HTTP header is set with "no-cache, no-store, must-revalidate". If an asset should be cached consider setting the directives "public, max-age, immutable".

### Reference


* [ https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching ](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html#web-content-caching)
* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
* [ https://grayduck.mn/2021/09/13/cache-control-recommendations/ ](https://grayduck.mn/2021/09/13/cache-control-recommendations/)


#### CWE Id: [ 525 ](https://cwe.mitre.org/data/definitions/525.html)


#### WASC Id: 13

#### Source ID: 3

### [ Session Management Response Identified ](https://www.zaproxy.org/docs/alerts/10112/)



##### Informational (Medium)

### Description

The given response has been identified as containing a session management token. The 'Other Info' field contains a set of header tokens that can be used in the Header Based Session Management Method. If the request is in a context which has a Session Management Method set to "Auto-Detect" then this rule will change the session management to use the tokens identified.

* URL: https://test.34.121.51.151.nip.io/api/auth/register
  * Node Name: `https://test.34.121.51.151.nip.io/api/auth/register ()({nombre,apellido,email,password,role})`
  * Method: `POST`
  * Parameter: `token`
  * Attack: ``
  * Evidence: `token`
  * Other Info: `json:token`


Instances: 1

### Solution

This is an informational alert rather than a vulnerability and so there is nothing to fix.

### Reference


* [ https://www.zaproxy.org/docs/desktop/addons/authentication-helper/session-mgmt-id/ ](https://www.zaproxy.org/docs/desktop/addons/authentication-helper/session-mgmt-id/)



#### Source ID: 3


