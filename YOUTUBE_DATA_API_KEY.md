# Obtain a YouTube Data API Key

Obtaining a Google API Key for use with the YouTube Data API is completely free.

1. You need a [Google Account](https://www.google.com/accounts/NewAccount) to access the Google API Console and request an API key
2. Create a project in the [Google Developers Console](https://console.developers.google.com/):

   - In the Google Cloud console, go to Menu menu > IAM & Admin > [Create a Project](https://console.cloud.google.com/projectcreate)
   - In the Project Name field, enter a descriptive name for your project. You can leave the name as the default "My Project xxxx" or you can change it to anything you like
   - "Location" field can be left as empty (No organisation)
   - Click "Create". The Google Cloud console navigates to the Dashboard page and your project is created within a few minutes.

3. After creating your project, make sure the YouTube Data API is one of the services that your application is registered to use:

   - Go to the [API Console](https://console.cloud.google.com/) and select the project that you just registered.
   - Visit the [Enabled APIs page](https://console.cloud.google.com/apis/enabled). In the list of APIs, make sure the status is ON for the YouTube Data API v3.
   - If "YouTube Data API" is not in the list, click on "Enable APIs and Services"
   - In the Text Box "Search for APIs and services", type "YouTube Data API v3" and enter.
   - In the results, click on "YouTube Data API v3"
   - In the page that opens, click on "Enable"

4. Open the [Credentials page](https://console.cloud.google.com/apis/credentials)
5. Click on "Create credentials" and select "API key" on the menu blade that is opened
6. Copy your API key

The API key you've just copied can be added to the yt-anti-translate extension's settings with the following steps:

1. Click on the extension icon
2. In the settings pop-up that opens, paste the API Key inside the "Enter API key" Text Box
3. Click on "Save API Key", and you are done

## Optional

It is recommended by Google to restrict the API Key to the services needed. Although optional, please follow the following steps to limit the API Key you've just created to be valid only for the YouTube Data API:

1. Open the [Credentials page](https://console.cloud.google.com/apis/credentials) and select the API key that you just created.
2. Under "API restrictions", select the "Restrict Key" option and use "Select APIs" to pick "YouTube Data API v3", check the checkbox and click "OK"
3. Click on "Save"

---

If the above instructions are outdated and do not work, you can check the following pages from Google Developers Documentation:

- [Create a Google Cloud project](https://developers.google.com/workspace/guides/create-project)
- [YouTube Data API Overview](https://developers.google.com/youtube/v3/getting-started)
- [Obtaining authorisation credentials](https://developers.google.com/youtube/registering_an_application)
- [Add API restrictions](https://cloud.google.com/docs/authentication/api-keys#adding-api-restrictions)
