import * as fs from 'fs'
import * as shell from 'shelljs'
import * as prerender from 'prerender';
import axios from 'axios';
import * as cliProgress from 'cli-progress';

const baseURL = process.argv[2];

if (!baseURL) {
  throw new Error('You shloud provide base URL')
}

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

const server = prerender({
  logRequests: false
});

const STATIC_DIR = 'static'

async function getPrerenderPageContent(url = ''): Promise<string> {
  const res = await axios.get(`http://localhost:3000/render?url=${baseURL}${url}`)
  return res.data
}

async function getAllUrls() {
  const HTMLContent = await getPrerenderPageContent('/')
  const urls = HTMLContent
    .match(/<a(.*?)href="(.*?)"(.*?)>/g)
    .map((url: string) => url.match(/<a(.*?)href="(.*?)"(.*?)>/)[2])
    .filter((url: string) => url.startsWith('/'))
    .reduce((acc: string[], url: string) => {
      return !acc.some(_ => _ === url)
        ? [...acc, url]
        : acc;
    }, [])

  return urls
}

async function getPrerenderPageContentAndSave(page) {
  const folder = `${STATIC_DIR}/${page}`
  if (!fs.existsSync(folder)) {
    shell.mkdir('-p', folder);
  }

  const HTMLContent = await getPrerenderPageContent(page)

  fs.writeFileSync(`${folder}/index.html`, HTMLContent)
}

async function start() {

  shell.rm('-rf', STATIC_DIR)
  
  server.start();

  const urls = await getAllUrls()

  progressBar.start(urls.length, 0);

  for (let i = 0; i < urls.length; i += 1) {
    progressBar.update(i + 1);

    await getPrerenderPageContentAndSave(urls[i])
  }

  progressBar.stop();
  console.log('\nDONE\n')
}

start()