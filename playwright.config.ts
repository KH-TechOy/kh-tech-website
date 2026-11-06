import { defineConfig } from '@playwright/test';
const executable=process.env.GAME_BROWSER_EXECUTABLE;
export default defineConfig({
  testDir:'./e2e',testMatch:'**/*.playwright.ts',timeout:180000,expect:{timeout:15000},workers:1,
  outputDir:'.playwright-artifacts',reporter:[['list']],
  use:{baseURL:'http://127.0.0.1:5173',headless:true,trace:'off',screenshot:'only-on-failure',launchOptions:{...(executable?{executablePath:executable}:{}),args:process.env.GAME_SOFTWARE_WEBGL==='1'?['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']:[]}},
  projects:[
    {name:'desktop',use:{viewport:{width:1440,height:900}}},
    {name:'portrait',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:'landscape',use:{viewport:{width:844,height:390},isMobile:true,hasTouch:true}},
  ],
  webServer:{command:`${process.platform==='win32'?'npm.cmd':'npm'} run dev -- --host 127.0.0.1 --port 5173 --strictPort`,url:'http://127.0.0.1:5173/peli/',reuseExistingServer:!process.env.CI,timeout:120000},
});
