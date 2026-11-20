export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "anoyt.onrender.com";
    return fetch(new Request(url, request));
  },
};

// temp commt for cahecking