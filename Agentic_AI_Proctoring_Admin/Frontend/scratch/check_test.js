const fetch = require('node-fetch');
async function check() {
    try {
        const testsRes = await fetch('http://localhost:8000/admin/tests');
        const tests = await testsRes.json();
        const testId = tests.find(t => true)?.test_id; // Just get the first test or find by candidate
        if (testId) {
            console.log("Test ID:", testId);
            const res = await fetch(`http://localhost:8000/admin/test/${testId}/Preview`);
            const data = await res.json();
            console.log("Essay config:", JSON.stringify(data.Essay, null, 2));
            const candRes = await fetch(`http://localhost:8000/candidate/${testId}/vishravi135@gmail.com/essay-result`);
            console.log("Essay result:", await candRes.text());
        }
    } catch(e) { console.error(e); }
}
check();
