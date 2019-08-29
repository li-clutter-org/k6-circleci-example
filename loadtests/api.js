import { sleep, check, group } from "k6";
import http from "k6/http";

import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js";

// Test configuration options
export const options = {
    stages: [
        { duration: "10s", target: 20 },
        { duration: "10s", target: 20 },
        { duration: "10s", target: 0 }
    ],
    thresholds: {
        "http_req_duration": ['p(95)<500', 'p(99)<1500'],
        "http_req_duration{name:PublicCrocs}": ['avg<400'],
        "http_req_duration{name:Create}": ['avg<600', 'max<1000'],
    },
    ext: {
        loadimpact: {
            name: "API Demo Test",
            projectID: parseInt(__ENV.PROJECT_ID),
            distribution: {
                "Ashburn - US": { loadZone: "amazon:us:ashburn", percent: 50 },
                "Dublin - Ireland": { loadZone: "amazon:ie:dublin", percent: 50 }
            }
        }
    }
};

function randomString(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    while (length--) res += charset[Math.random() * charset.length | 0];
    return res;
}

// Test vars
const USERNAME = 'robin.demo@example.com';
const PASSWORD = 'superCroc2019';
const BASE_URL = 'https://test-api.loadimpact.com';

// Test setup function (run by 1 VU only)
export function setup() {
    // Register a new user (if not already created).
    let res = http.post(`${BASE_URL}/user/register/`, {
        first_name: 'Crocodile',
        last_name: 'Owner',
        username: USERNAME,
        password: PASSWORD,
    });
    check(res, {
        "Created user": res => { return res.status === 201 }
    });

    // Authenticate with username and password to retrieve Bearer token
    let loginRes = http.post(`${BASE_URL}/auth/token/login/`, {
        username: USERNAME,
        password: PASSWORD
    });
    let authToken = loginRes.json('access');
    check(authToken, {
        "Logged in successfully": () => authToken !== '',
    });
    return authToken;
}

// Test main function (run by every VU)
export default function(authToken) {
    group('Public endpoints', () => {
        // http.batch makes requests in parallel
        let res = http.batch([
            ['GET', `${BASE_URL}/public/crocodiles/1/`, null, {tags: {name: "PublicCrocs"}}],
            ['GET', `${BASE_URL}/public/crocodiles/2/`, null, {tags: {name: "PublicCrocs"}}],
            ['GET', `${BASE_URL}/public/crocodiles/3/`, null, {tags: {name: "PublicCrocs"}}],
            ['GET', `${BASE_URL}/public/crocodiles/4/`, null, {tags: {name: "PublicCrocs"}}],
        ]);

        //console.log(res[1].body);

        // Check that all the public crocodiles are older than 5
        const ages = Object.values(res).map(res => res.json('age'));
        check(ages, {
            "Crocs are older than 5 years of age": Math.min(...ages) > 5
        });
    });

    // Create some crocodiles
    group('Create crocs', () => {
        const payload = {
            name: `Jerry ${randomString(5)}`,
            sex: 'M',
            date_of_birth: '2001-01-01',
        };
        const res = http.post(`${BASE_URL}/my/crocodiles/`, payload, {
            headers: {Authorization: `Bearer ${authToken}`},
            tags: {name: 'Create'}
        });
        check(res, {
            "Croc created successfully": res => { return res.status === 201 }
        });
    });

    // My crocodiles
    group('Get crocs', () => {
        let res = http.get("https://test-api.loadimpact.com/my/crocodiles/", {
            headers: {Authorization: `Bearer ${authToken}`}
        });
        check(res, {
            "$[0].name contains Jerry": res => {
                const values = jsonpath.query(res.json(), "$[0].name");
                return !!values.find(value => value.indexOf("Jerry") !== -1);
            }
        });
    });

    sleep(1);
}