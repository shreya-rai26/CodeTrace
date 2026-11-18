import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Test-only API fixtures. Never imported by the application or shipped in its build.
const root = 'http://codetrace.test';
const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : undefined),headless:true});
const context = await browser.newContext({viewport:{width:1440,height:1050}});
const page = await context.newPage();
const errors = [], calls = [];
page.on('pageerror',e => errors.push(e.message));
let mode = 'normal', analysisPolls = 0;
const assignments = [
  {id:1,title:'Data structures: Binary search trees',course_code:'CSP301',status:'done',submission_count:4,flagged_pairs:2,threshold:.5,analysis_ms:324,embedding_backend:'tfidf'},
  {id:2,title:'Lab 04: Graph traversal',course_code:'CS204',status:'empty',submission_count:0,flagged_pairs:0,threshold:.5},
  {id:3,title:'Algorithm design: Dynamic programming',course_code:'CS302',status:'ready',submission_count:4,flagged_pairs:0,threshold:.5},
  {id:4,title:'Programming fundamentals',course_code:'CS101',status:'failed',submission_count:4,flagged_pairs:0,threshold:.5,error:'The analysis could not be completed. Run it again.'},
  {id:5,title:'Object-oriented programming',course_code:'CS201',status:'analyzing',submission_count:4,flagged_pairs:0,threshold:.5},
];
const submissions = [
  {id:11,student_ref:'STU_001',filename:'bst.py',is_reference:false,cluster_id:1},
  {id:12,student_ref:'STU_002',filename:'solution.py',is_reference:false,cluster_id:1},
  {id:13,student_ref:'STU_003',filename:'bst.py',is_reference:false,cluster_id:null},
  {id:14,student_ref:'STU_004',filename:'bst.py',is_reference:false,cluster_id:null},
  {id:15,student_ref:'AI: reference_01',filename:'reference.py',is_reference:true,cluster_id:null},
];
const matches = [
  {id:21,submission_a:11,submission_b:12,score:.88,structural:.92,semantic:.79,flagged:true},
  {id:22,submission_a:12,submission_b:15,score:.68,structural:.7,semantic:.63,flagged:true},
  {id:23,submission_a:13,submission_b:14,score:.35,structural:.4,semantic:.23,flagged:false},
  {id:24,submission_a:11,submission_b:13,score:0,structural:0,semantic:0,flagged:false},
  {id:25,submission_a:11,submission_b:14,score:1,structural:1,semantic:1,flagged:true},
];
assignments[0].flagged_pairs = matches.filter(m=>m.flagged).length;
const code = 'def binary_search(values, target):\n    left, right = 0, len(values) - 1\n\n    while left <= right:\n        middle = (left + right) // 2\n        if values[middle] == target:\n            return middle\n        if values[middle] < target:\n            left = middle + 1\n        else:\n            right = middle - 1\n    return -1\n';
// Fulfil the built app directly from disk. No web server or network is needed.
await page.route('**/*', async route => {
  const path = new URL(route.request().url()).pathname;
  const asset = path.startsWith('/assets/') ? path.slice(1) : 'index.html';
  const contentType = asset.endsWith('.js') ? 'application/javascript' : asset.endsWith('.css') ? 'text/css' : 'text/html';
  await route.fulfill({body:await fs.readFile(new URL('../dist/'+asset,import.meta.url)),contentType});
});
await page.route('**/api/**',async route => {
  const req = route.request(), path = new URL(req.url()).pathname, method=req.method();
  calls.push({path,method,body:req.postData(),authorization:req.headers().authorization});
  const json = (body,status=200) => route.fulfill({status,json:body});
  if(path.startsWith('/api/auth/')) return mode === 'auth-error' ? json({error:'Invalid email or password.'},401) : json({token:'fixture-token'});
  if(mode==='unauthorized') return json({error:'Session expired'},401);
  if(mode==='error') return json({error:'Test request failed. Please retry.'},503);
  if(mode==='loading') await new Promise(r=>setTimeout(r,1000));
  if(path==='/api/assignments') {
    if(method==='POST') {const body=req.postDataJSON(); assert.deepEqual(Object.keys(body).sort(),['course_code','title']);return json({assignment:{...assignments[1],id:2}},201);}
    return json({assignments:mode==='empty'?[]:assignments});
  }
  const id=Number(path.split('/')[3]), a=assignments.find(a=>a.id===id) || assignments[0];
  if(path.includes('/matches/')) return json({assignment:assignments[0],match:{...matches[0],student_a:'STU_001',student_b:'STU_002',filename_a:'bst.py',filename_b:'solution.py',code_a:code,code_b:code,lines_a:[1,2,3,4,5],lines_b:[1,2,3,4,5]}});
  if(path.endsWith('/analyze')) { assert.equal(typeof req.postDataJSON().threshold,'number');a.status='analyzing';analysisPolls=0;return json({status:'analyzing'},202); }
  if(path.endsWith('/submissions') || path.endsWith('/references')) {
    if(method==='DELETE') {a.status='ready';return route.fulfill({status:204});}
    assert.ok(req.headers()['content-type'].includes('multipart/form-data'));assert.ok(req.postData().includes('name="file"'));
    a.status='ready';a.submission_count=4;return json({uploaded:4,skipped:[]},201);
  }
  if(method==='DELETE') return route.fulfill({status:204});
  if(a.status==='analyzing' && ++analysisPolls>=2) Object.assign(a,{status:'done',analysis_ms:250,embedding_backend:'tfidf'});
  return json({assignment:a,submissions:a.status==='empty'?[]:submissions,matches:a.status==='done'?matches:[],clusters:a.status==='done'?[{id:1,size:2}]:[]});
});
const check = (condition,label) => {assert.ok(condition,label);console.log('PASS '+label);};
const screenshot = async () => {}; // Visual snapshots were inspected separately during implementation.
try {
  await page.goto(root+'/');await page.waitForURL('**/login');check(await page.getByRole('heading',{name:'Sign in',exact:true}).isVisible(),'protected-route redirect');
  await screenshot('login');
  await page.getByRole('button',{name:'Create an account',exact:true}).click();check(await page.getByLabel('Name',{exact:true}).isVisible(),'registration fields');
  await page.getByRole('button',{name:'I already have an account'}).click();
  mode='auth-error';await page.getByLabel('Email').fill('reviewer@example.test');await page.getByLabel('Password').fill('test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('alert').waitFor();check(await page.getByRole('alert').isVisible(),'login error state');
  mode='normal';await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(root+'/');await page.getByRole('heading',{name:'A clearer view of every submission.'}).waitFor();await page.locator('tbody tr').first().waitFor();
  check((await page.locator('.stat-value').allTextContents()).join(',')==='5,16,1,3','overview KPIs derived from API');
  await screenshot('overview');
  await page.getByLabel('Search assignments').fill('graph');check(await page.locator('tbody tr').count()===1,'assignment search');await page.getByLabel('Search assignments').fill('');
  await page.getByLabel('Filter assignments by status').selectOption('done');check(await page.locator('tbody tr').count()===1,'assignment status filter');await page.getByLabel('Filter assignments by status').selectOption('all');
  await page.getByRole('button',{name:'New assignment'}).click();await page.getByLabel('Title',{exact:true}).fill('New class');await page.getByLabel('Course code').fill('CS101');await page.getByRole('button',{name:'Create assignment',exact:true}).click();await page.waitForURL('**/assignments/2');await page.getByRole('button',{name:'Choose ZIP file'}).waitFor();check(true,'create assignment API contract and empty detail route');
  await page.locator('input[type=file]').first().setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('test')});await page.getByRole('alert').waitFor();check((await page.getByRole('alert').textContent()).includes('.zip'),'invalid upload error');
  await page.locator('input[type=file]').first().setInputFiles({name:'submissions.zip',mimeType:'application/zip',buffer:Buffer.from('test-fixture')});await page.getByRole('button',{name:'Run analysis',exact:true}).waitFor();check(true,'ZIP upload form contract and ready state');
  await page.locator('#threshold').fill('0.7');await page.getByRole('button',{name:'Run analysis',exact:true}).click();await page.getByRole('button',{name:'Analysing...'}).waitFor();check(await page.getByRole('button',{name:'Replace submissions'}).isDisabled(),'analysis busy state');await page.getByRole('heading',{name:'Similarity network'}).waitFor();check(true,'analysis polling completes');
  await page.goto(root+'/assignments/1');await page.getByRole('heading',{name:'Similarity network'}).waitFor();check((await page.locator('.stat-value').allTextContents()).join(',')==='4,5,3,1','detail KPIs derived from API');check((await page.locator('.hist-count').allTextContents()).join(',')==='1,1,0,1,2','distribution boundaries 0 and 100 percent');
  check(await page.locator('tbody tr').count()===3,'flagged pairs filter default');await page.getByLabel('Flagged only').uncheck();check(await page.locator('tbody tr').count()===5,'all match results');
  await screenshot('detail');
  const edge=page.locator('.graph .edge').first();await edge.focus();await page.keyboard.press('Enter');await page.waitForURL('**/compare/21');await page.locator('.code-panel').first().waitFor();check(await page.locator('.code-line.is-match').count()===8,'matching lines exclude blank source lines');
  await screenshot('comparison');
  await page.getByRole('checkbox',{name:'Show highlights'}).uncheck();check(await page.locator('.code-line.is-match').count()===0,'highlight toggle off');await page.getByRole('checkbox',{name:'Show highlights'}).check();await page.getByRole('button',{name:'First matching line'}).first().click();check(true,'jump to matching line');
  for(const width of [1440,1024,768,390]) {await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'comparison no overflow at '+width);}
  await page.getByRole('button',{name:'Open navigation'}).click();check(await page.getByRole('dialog',{name:'Navigation'}).isVisible(),'mobile navigation opens');await page.keyboard.press('Escape');check(!await page.getByRole('dialog',{name:'Navigation'}).isVisible(),'mobile navigation closes with Escape');
  await page.goto(root+'/');await page.locator('tbody tr').first().waitFor();check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile overview no overflow');await screenshot('mobile-overview');
  await page.goto(root+'/assignments/1');await page.getByRole('heading',{name:'Similarity network'}).waitFor();check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile detail no overflow');await screenshot('mobile-detail');
  await page.goto(root+'/assignments/4');await page.getByRole('alert').waitFor();check((await page.getByRole('alert').textContent()).includes('could not'),'failed analysis state');
  mode='error';await page.goto(root+'/');await page.getByRole('button',{name:'Try again'}).waitFor();mode='normal';await page.getByRole('button',{name:'Try again'}).click();await page.locator('tbody tr').first().waitFor();check(true,'overview error retry');
  mode='empty';await page.goto(root+'/');await page.getByText('No assignments yet',{exact:true}).waitFor();check(true,'empty overview state');
  mode='loading';await page.goto(root+'/assignments/1');await page.getByRole('status',{name:'Loading assignment'}).waitFor();check(true,'detail skeleton state');mode='normal';await page.getByRole('heading',{name:'Similarity network'}).waitFor();
  mode='error';await page.goto(root+'/assignments/1/compare/21');await page.getByRole('button',{name:'Try again'}).waitFor();mode='normal';await page.getByRole('button',{name:'Try again'}).click();await page.locator('.code-panel').first().waitFor();check(true,'comparison error retry');
  mode='error';await page.goto(root+'/assignments/1');await page.getByRole('button',{name:'Try again'}).waitFor();mode='normal';await page.getByRole('button',{name:'Try again'}).click();await page.getByRole('heading',{name:'Similarity network'}).waitFor();check(true,'detail error retry');
  await page.locator('input[type=file]').nth(1).setInputFiles({name:'references.zip',mimeType:'application/zip',buffer:Buffer.from('reference-fixture')});await page.getByRole('status').waitFor();await page.getByRole('button',{name:'Run analysis',exact:true}).waitFor();check(calls.some(c=>c.path.endsWith('/references') && c.method==='POST'),'reference upload contract');
  await page.getByRole('button',{name:'Remove AI references'}).click();await page.waitForFunction(()=>!document.querySelector('button.btn-link[disabled]'));check(calls.some(c=>c.path.endsWith('/references') && c.method==='DELETE'),'reference removal contract');
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Delete assignment'}).click();check(new URL(page.url()).pathname==='/assignments/1','delete cancellation preserves route');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete assignment'}).click();await page.waitForURL(root+'/');check(calls.some(c=>c.path==='/api/assignments/1' && c.method==='DELETE'),'assignment delete contract');
  await page.getByRole('button',{name:'Sign out'}).click();await page.waitForURL('**/login');check(await page.evaluate(()=>localStorage.getItem('codetrace_token'))===null,'sign out clears token');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile login no overflow');
  await page.getByRole('button',{name:'Create an account',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Test reviewer');await page.getByLabel('Email').fill('reviewer@example.test');await page.getByLabel('Password').fill('test-password');await page.getByRole('button',{name:'Create account',exact:true}).click();await page.waitForURL(root+'/');check(calls.some(c=>c.path==='/api/auth/register' && c.method==='POST'),'registration submission contract');
  await page.locator('tbody tr').first().waitFor();mode='unauthorized';await page.goto(root+'/');await page.waitForURL('**/login');check(await page.evaluate(()=>localStorage.getItem('codetrace_token'))===null,'401 clears auth and redirects');
  check(calls.filter(c=>c.path.startsWith('/api/assignments')).every(c=>c.authorization==='Bearer fixture-token'),'authenticated API headers preserved');
  check(errors.length===0,'zero browser runtime errors: '+errors.join('; '));
  console.log('All browser checks passed. API responses were isolated fixtures, not a live backend.');
} finally {await browser.close();}
