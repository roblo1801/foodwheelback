const express = require("express");
const cors = require("cors");
const app = express();
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

app.use(cors());
app.use(express.json());

const port = 5000;

app.get("/restaurants", async (req, res) => {
  const { location } = req.query;
  const resultsPerPage = 20;
  let results = [];
  let next_page_token = "";

  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        type: "restaurant",
        location,
        radius: 15 * 1609.34,
        key: process.env.GOOGLE_PLACES_API_KEY,
      },
    }
  );
  results = results.concat(data.results);
  next_page_token = data.next_page_token;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  while (next_page_token) {
    await delay(2000);
    const nextPage = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      {
        params: {
          pagetoken: next_page_token,
          type: "restaurant",
          location,
          radius: 1609.34 * 15,
          key: process.env.GOOGLE_PLACES_API_KEY,
        },
      }
    );

    results = results.concat(nextPage.data.results);
    next_page_token = nextPage.data.next_page_token;
  }

  const requests = results.map((result) => {
    const photo_reference =
      result.photos && result.photos.length > 0
        ? result.photos[0].photo_reference
        : null;

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      result.vicinity
    )}`;
    if (photo_reference) {
      return axios
        .get("https://maps.googleapis.com/maps/api/place/photo", {
          params: {
            maxwidth: 400,
            photoreference: photo_reference,
            key: process.env.GOOGLE_PLACES_API_KEY,
          },
        })
        .then((response) => ({
          ...result,
          mapUrl,
          address: result.vicinity,
          photo: response.request.res.responseUrl,
        }));
    } else {
      return {
        ...result,
        mapUrl,
        address: result.vicinity,
        photo: null,
      };
    }
  });

  const restaurants = await axios.all(requests);

  res.json(restaurants);
});

app.get("/restaurants/details", async (req, res) => {
  const { place_id } = req.query;
  const { data } = await axios.get(
    "https://maps.googleapis.com/maps/api/place/details/json",
    {
      params: {
        place_id,
        key: process.env.GOOGLE_PLACES_API_KEY,
      },
    }
  );
  res.json(data);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
