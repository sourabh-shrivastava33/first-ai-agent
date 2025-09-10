import axios from "axios";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

async function getWeatherDetailsByCity(cityname = "") {
  const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: "text" });
  return `The current weather of ${cityname} is ${data}`;
}

async function getGithubUserInfoByUsername(username = "") {
  const url = `https://api.github.com/users/${username.toLowerCase()}`;
  const { data } = await axios.get(url);
  return JSON.stringify({
    login: data.login,
    id: data.id,
    name: data.name,
    location: data.location,
    twitter_username: data.twitter_username,
    public_repos: data.public_repos,
    public_gists: data.public_gists,
    user_view_type: data.user_view_type,
    followers: data.followers,
    following: data.following,
  });
}

function createFolder(folderName) {
  const folderPath = path.join(process.cwd(), folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`✅ Folder '${folderName}' created at ${folderPath}`);
  } else {
    console.log(`⚠️ Folder '${folderName}' already exists at ${folderPath}`);
  }
}
function createFile(folderPath, fileName, content = "") {
  try {
    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`📂 Folder created: ${folderPath}`);
    }

    // Full path of the file
    const filePath = path.join(folderPath, fileName);

    // Create the file with content
    fs.writeFileSync(filePath, content);
    console.log(`✅ File '${fileName}' created at ${filePath}`);
  } catch (err) {
    console.error("❌ Error creating file:", err);
  }
}

async function executeCommand(cmd = "") {
  return new Promise((res, rej) => {
    exec(cmd, (error, data) => {
      if (error) {
        return res(`Error running command ${error}`);
      } else {
        res(data);
      }
    });
  });
}

export {
  getWeatherDetailsByCity,
  getGithubUserInfoByUsername,
  createFolder,
  createFile,
  executeCommand,
};
