<div align="center"> 
  <image src="./images/logo.png?raw=true" width="30" height="30">
  <h2>Z Squared Server</h2>
  <p>Welcome to the official documentation for the Z Squared website API server, a modern full-stack blog website using React and Chakra UI, with Notion serving as the backend CMS/database. This repo serves as the GraphQL API server connecting the website to Notion!</p>
</div>

### 👨🏾‍💻 Tech Stack
- **Language:** TypeScript
- **Frontend:** React
- **UI Framework:** ChakraUI
- **Server Runtime:** NodeJS
- **API Framework:** GraphQL
- **CMS/Database:** Notion

### 🤸🏾‍♂️ Usage
#### 🚧 Prerequisites
- Have `npm` or `yarn` installed!
- Create a `.env` file with the following environment variables:
  + `NOTION_TOKEN`: The API key for the Notion integration
  + `BLOG_DB_ID`: The unique ID for the Notion database 

### ⚙️ Running locally
1. **Clone the repository:**
```sh
git clone https://google.ca
```

2. **Install dependencies:**
```sh
yarn # npm i
```

3. **Build the app:**
```sh
yarn build # npm run build
```

4. **Start the app:**
```sh
yarn start # npm start
```
> To watch for changes and re-run, use `yarn dev`
> To run without building, use `yarn dev:start`

### 📥 Issues
Feel free to raise an [issue](https://github.com/ammar-ahmed22/zsquared-server/issues) with any bugs, features or design changes!

All Rights Reserved (Ammar Ahmed, 2024)