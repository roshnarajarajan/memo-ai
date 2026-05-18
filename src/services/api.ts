import axios from "axios";

const API = axios.create({
  baseURL: "https://memo-ai-k8qw.onrender.com/api"
});

export default API;