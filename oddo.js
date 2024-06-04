import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { setTimeout } from "timers/promises";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

puppeteer.use(StealthPlugin());

const email = process.env.ODDO_EMAIL;
const password = process.env.ODDO_PASSWORD;
const oddo_domain = process.env.ODDO_DOMAIN;

const new_app = "Testing"
const models = ["mod-1", "model-2", "model-3"];

//// Login
// Save Cookies
async function saveCookies(cookie, outputFile) {
  fs.writeFileSync(outputFile, JSON.stringify(cookie));
}

// Function to check if the cookie is expired
function isCookieExpired(cookies) {
  const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
  const sessionCookie = cookies.find((cookie) => cookie.name === "session_id");

  return sessionCookie && sessionCookie.expires < currentTime;
}

// Login function
async function loginPage(email, password, page, loginUrl, browser) {
  const url = loginUrl;

  await page.goto(url, { waitUntil: "domcontentloaded" });

  await page.type('input[name="login"]', email, { delay: 200 });
  await page.type('input[name="password"]', password, { delay: 200 });
  await page.click('button[type="submit"]');

  await setTimeout(2000);

  const loginWrong = await page.$("form > p.alert.alert-danger");

  if (loginWrong) {
    console.log("Credentials are wrong, Login failed.");

    // Close the browser
    await browser.close();
    return false;
  }

  // await page.waitForNavigation();

  // Logging log when authentication
  console.log("login successfully ...");

  return true;
}

//// Model
async function createNewModel(page, item) {
  const newModel = "a.o_web_create_new_model";
  await clickButton(page, newModel);

  // Input menu model
  await inputAppOrModel(page, "model_name", item);

  // Configure model
  await clickButton(page, "button.confirm_button");

  // Create model
  await clickButton(page, "button.o_web_studio_model_configurator_next");

  await setTimeout(3000);
}

// Function to create a new model
// async function createModel(modelName) {
//   // Click on 'Models'
//   await page.click('button[data-section="models"]');
//   await page.waitForSelector(".o_web_studio_model_list");

//   // Click on 'Create'
//   await page.click("button.o_web_studio_add_model");
//   await page.waitForSelector(".o_web_studio_add_model_modal");

//   // Fill in model details
//   await page.type('input[name="name"]', modelName);
//   await page.click("button.btn-primary"); // Save
//   await page.waitForTimeout(2000); // Wait for the model to be created
// }

// Function to add fields to a model
async function addFieldsToModel(modelName, fields) {
  await page.click(`button[data-name="${modelName}"]`);
  await page.waitForSelector(".o_web_studio_fields");

  for (const field of fields) {
    await page.click("button.o_web_studio_add_field");
    await page.type("input.o_input", field.name);
    await page.select("select.o_web_studio_field_type", field.type);
    await page.click("button.o_web_studio_add_field_button");
    await page.waitForTimeout(1000); // Wait for the field to be added
  }

  await page.click("button.o_web_studio_save_model"); // Save changes
}

// Function click next button
async function clickButton(page, selector) {
  const nextBtn = selector;
  await page.waitForSelector(nextBtn);
  await page.click(nextBtn);
  await setTimeout(2000);
}

async function createNewApp(page, models, application) {
  await clickButton(page, "a.o_web_studio_new_app");

  // Click next button
  const nextBtn = 'button[title="Next"]';
  await clickButton(page, nextBtn);

  // Input new App
  await inputAppOrModel(page, "appName", application);

  // Click next button
  await clickButton(page, nextBtn);

  // Input menu model
  await inputAppOrModel(page, "menuName", models[0]);

  // Click next button
  await clickButton(page, nextBtn);

  // Click create app
  await clickButton(page, "button.btn-primary");

  await setTimeout(2000);
}

// Function input app or model
async function inputAppOrModel(page, nameSelector, valueSelector) {
  const inputApp = `input[name="${nameSelector}"]`;
  await page.waitForSelector(inputApp);
  await page.type(inputApp, valueSelector, { delay: 200 });
}

(async () => {
  try {
    // Puppeteer Setup
    const browser = await puppeteer.launch({
      headless: false,
      args: [`--no-sandbox`],
    });

    // Opening newPage
    const page = await browser.newPage();
    console.log("logging in ...");

    // Check if cookies available
    const cookiesFilePath = "./oddo_cookies.json";
    const existCookies = fs.existsSync(cookiesFilePath);
    let loginSuccesfully = false;

    // Condition between cookies exist and expiration of cookies
    if (existCookies) {
      const cookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf-8"));

      if (!isCookieExpired(cookies)) {
        // Set the cookies in the browser
        await page.setCookie(...cookies);
        console.log("Cookies are set and still valid, logged in ...");
      } else {
        console.log("Cookies are expired, logging in again ...");
        loginSuccesfully = await loginPage(
          email,
          password,
          page,
          `https://${oddo_domain}.odoo.com/web/login`,
          browser
        );

        if (loginSuccesfully) {
          // Save the new cookies after re-login
          const newCookies = await page.cookies();
          await saveCookies(newCookies, cookiesFilePath);
          console.log("Saved new cookies ...");
        }
      }
    } else {
      console.log("No cookies found, logging in ...");
      loginSuccesfully = await loginPage(
        email,
        password,
        page,
        `https://${oddo_domain}.odoo.com/web/login`,
        browser
      );

      if (loginSuccesfully) {
        // Save the new cookies if login was performed
        const cookies = await page.cookies();
        await saveCookies(cookies, cookiesFilePath);
        console.log("Saved cookies ...");
      }
    }

    // goto main page
    // const mainMenu = `https://${oddo_domain}.odoo.com/odoo`;
    // await page.goto(mainMenu);

    // // Click studio button
    // const btnStudio = 'button[title="Toggle Studio"]';
    // await page.waitForSelector(btnStudio);
    // await page.click(btnStudio);
    // await setTimeout(2000);

    // // MAKE APP AND MODEL
    // // Make new application
    console.log('creating application ..')
    await createNewApp(page, models, new_app)

    // // // Duplicate Model Name
    // // const duplicateName = "div.o_error_dialog";
    // // if (duplicateName) {
    // //   console.log(`name model ${models[0]} is duplicate`);
    // //   await browser.close();
    // // }

    // // Loop making models
    // console.log('creating models ..')
    // for (let model of models.slice(1)) {
    //   // Create new model
    // console.log(`created model ${model}`)
    //   await createNewModel(page, model);
    // }

    // MAKE MODEL FIELDS
    await page.goto("https://ijsamikaika.odoo.com/odoo/studio?cids=1&mode=editor&_action=175&_view_type=form&_tab=views")
    for(let model of models){
      const modelSelector = `a:contains("${model}")`

      await clickButton(page, modelSelector)

      for (const field of fields) {
        await page.click('button.o_web_studio_add_field');
        await page.type('input.o_input', field.name);
        await page.select('select.o_web_studio_field_type', field.type);
        await page.click('button.o_web_studio_add_field_button');
        await page.waitForTimeout(1000); // Wait for the field to be added
    }

    }

    await browser.close();
  } catch (error) {
    console.log(error);
  }
})();
