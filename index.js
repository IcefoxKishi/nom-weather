"use strict";

import { fetchWeatherApi } from "https://esm.sh/openmeteo";
import * as cn from "https://unpkg.com/chinese-numbering@1.x/bundle/es.js";
import { solar2lunar, jdFromDate } from "./lunar.js";

const HOURLY_WEATHER_ID = "hourly";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_NUM_DAYS = 10;

const DEGREE_SYMBOL = "度";
const FEELS_LIKE = "感覺如";
const SUNRISE = "𩈘𡗶𠚐";
const SUNSET = "𩈘𡗶𣵰";
const YEAR = "𢆥";
const MONTH = "𣎃";
const DAY = "𣈗";
const KE = "刻";

const LONG_SPACE = "　";

const WEATHER_CODES = {
  0: "𡗶光",
  1: "可光",
  2: "唏𩄲",
  3: "𡗉𩄲",

  45: "霜霧",
  48: "霜𪉥",

  51: "𩅹洨珥",
  53: "𩅹洨𣃤",
  55: "𩅹洨𨤼",
  56: "𩅹洨氷珥",
  57: "𩅹洨氷𨤼",

  61: "𩅹噴𡮈",
  63: "𩅹噴",
  65: "𩅹噴𡚡",
  66: "𩅹氷𡮈",
  67: "𩅹氷𡚡",

  71: "雪淶珥",
  73: "雪淶",
  75: "雪淶𡗉",

  77: "𩅹雪毼",

  80: "𩅹洨珥",
  81: "𩅹洨",
  82: "𩅹洨𡚡",
  85: "𩅹雪𡮈",
  86: "𩅹雪𡚡",

  95: "雹",
  96: "𩅹𥒥珥",
  97: "雹𡚡",
  99: "𩅹𥒥𨤼",
};

// This is needed bc the Lunar library outputs solar terms in simplified
const SOLAR_TERMS_TRADITIONAL = {
  惊蛰: "驚蟄",
  谷雨: "穀雨",
  小满: "小滿",
  芒种: "芒種",
  处暑: "處暑",
};

const 天干順序 = "甲乙丙丁戊己庚辛壬癸";
const 地支順序 = "子丑寅卯辰巳午未申酉戌亥";
const DIGITS = [..."空𠬠𠄩𠀧𦊚𠄼𦒹𠤩𠔭𠃩"];
const 曜日順序 = [..."日𠄩𠀧四𠄼𦒹𠤩"];
const 干支配數 = 60;
const DIRECTIONS = [
  "北（離）",
  "東北（坤）",
  "東（兌）",
  "東南（乾）",
  "南（坎）",
  "西南（艮）",
  "西（震）",
  "西北（巽）",
];
const DEGREES_IN_CIRCLE = 360;
const DIR_INTERVAL = DEGREES_IN_CIRCLE / DIRECTIONS.length;
const SOLAR_HOLIDAYS = new WeakMap();
const LUNAR_HOLIDAYS = new WeakMap();
SOLAR_HOLIDAYS.set([1, 1], "節陽曆");
SOLAR_HOLIDAYS.set([30, 4], "𣈗解放沔南");
SOLAR_HOLIDAYS.set([1, 5], "國際勞動");
SOLAR_HOLIDAYS.set([7, 5], "𣈗戰勝奠邊府");
SOLAR_HOLIDAYS.set([19, 8], "𣈗革命𣎃𠔭");
SOLAR_HOLIDAYS.set([2, 9], "𣈗國慶");
SOLAR_HOLIDAYS.set([24, 11], "𣈗文化");
SOLAR_HOLIDAYS.set([25, 12], "禮降生");
LUNAR_HOLIDAYS.set([1, 1], "曚𠬠節");
LUNAR_HOLIDAYS.set([2, 1], "曚𠄩節");
LUNAR_HOLIDAYS.set([3, 1], "曚𠀧節");
LUNAR_HOLIDAYS.set([4, 1], "曚𦊚節");
LUNAR_HOLIDAYS.set([5, 1], "曚𠄼節");
LUNAR_HOLIDAYS.set([15, 1], "節元宵");
LUNAR_HOLIDAYS.set([3, 3], "節寒食");
LUNAR_HOLIDAYS.set([15, 4], "禮佛誕");
LUNAR_HOLIDAYS.set([5, 5], "節端午");
LUNAR_HOLIDAYS.set([15, 7], "禮盂蘭");
LUNAR_HOLIDAYS.set([15, 8], "節中秋");
LUNAR_HOLIDAYS.set([23, 12], "節翁公翁竈");
const PRESIDENT_BDAY = [10, 7];
const PRESIDENT_FIRST_YEAR = 2024;
const PRESIDENT = "蘇總";

function setText(id, text) {
  document.getElementById(id).innerHTML = String(text);
}

function unicodeSlice(str, start, end) {
  const codePoints = [...str];
  return codePoints.slice(start, end).join("");
}

function hanziNum(n) {
  if (n == 10) {
    return "𨒒";
  }
  if (n > 10 && n < 20) {
    return "𨒒" + String(n - 10).replace(/\d/g, (m) => DIGITS[m]);
  }
  let j = String(n).replace(/\d/g, (m) => DIGITS[m]);
  if ((n > 10) & (n % 10 == 4)) {
    j = unicodeSlice(j, 0, -1) + "四";
  }
  if ((n > 10) & (n % 10 == 0)) {
    j = unicodeSlice(j, 0, -1) + "𠦩";
  }
  return j;
}

function temperatureText(temp) {
  return hanziNum(Math.round(temp)) + DEGREE_SYMBOL;
}

function getGanZhi(date) {
  return (
    天干順序[
      (jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear()) +
        9) %
        10
    ] +
    地支順序[
      (jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear()) +
        1) %
        12
    ]
  );
}
function getYearGanZhi(year) {
  return 天干順序[(year + 6) % 10] + 地支順序[(year + 8) % 12];
}
function lunarDateToNom(date) {
  var day, month, year;
  var leap = "";
  if (date[0] <= 10) {
    day = "曚" + hanziNum(date[0]);
  } else {
    day = "𣈗" + hanziNum(date[0]);
  }
  if (month != 12) {
    month = "𣎃" + hanziNum(date[1]);
  } else {
    month = "𣎃𣎖";
  }
  if (date[3] == 1) {
    leap = "閏";
  }
  year = "𢆥" + getYearGanZhi(date[2]);
  return day + month + leap + year;
}
async function getWeather(lat, long) {
  const params = {
    latitude: lat,
    longitude: long,
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "weather_code",
      "sunrise",
      "sunset",
    ],
    hourly: [
      "temperature_2m",
      "precipitation_probability",
      "precipitation",
      "rain",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "showers",
      "snowfall",
      "weather_code",
    ],
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
    ],
    timezone: "auto",
    past_hours: 0,
    forecast_hours: 24,
    past_days: 0,
    forecast_days: FORECAST_NUM_DAYS,
  };

  const responses = await fetchWeatherApi(OPEN_METEO_URL, params);
  // Process first location. Add a for-loop for multiple locations or weather models
  const res = responses[0];

  const utcOffsetSec = res.utcOffsetSeconds();

  const curr = res.current();
  const hourly = res.hourly();
  const daily = res.daily();

  // Note: The order of weather variables in the URL query and the indices below need to match!
  const weatherData = {
    current: {
      time: new Date((Number(curr.time()) + utcOffsetSec) * 1000),
      temperature_2m: curr.variables(0).value(),
      relative_humidity_2m: curr.variables(1).value(),
      apparent_temperature: curr.variables(2).value(),
      wind_speed_10m: curr.variables(3).value(),
      wind_direction_10m: curr.variables(4).value(),
      wind_gusts_10m: curr.variables(5).value(),
      precipitation: curr.variables(6).value(),
      rain: curr.variables(7).value(),
      showers: curr.variables(8).value(),
      snowfall: curr.variables(9).value(),
      weather_code: hourly.variables(10).value(),
    },
    hourly: {
      time: Array.from(
        {
          length:
            (Number(hourly.timeEnd()) - Number(hourly.time())) /
            hourly.interval(),
        },
        (_, i) =>
          new Date((Number(hourly.time()) + i * hourly.interval()) * 1000),
      ),
      temperature_2m: hourly.variables(0).valuesArray(),
      precipitation_probability: hourly.variables(1).valuesArray(),
      precipitation: hourly.variables(2).valuesArray(),
      rain: hourly.variables(3).valuesArray(),
      wind_speed_10m: hourly.variables(4).valuesArray(),
      wind_direction_10m: hourly.variables(5).valuesArray(),
      wind_gusts_10m: hourly.variables(6).valuesArray(),
      showers: hourly.variables(7).valuesArray(),
      snowfall: hourly.variables(8).valuesArray(),
      weather_code: hourly.variables(9).valuesArray(),
    },
    daily: {
      time: Array.from(
        {
          length:
            (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval(),
        },
        (_, i) =>
          new Date((Number(daily.time()) + i * daily.interval()) * 1000),
      ),
      temperature_2m_max: daily.variables(0).valuesArray(),
      temperature_2m_min: daily.variables(1).valuesArray(),
      weather_code: daily.variables(2).valuesArray(),
      sunrise: [...Array(daily.variables(3).valuesInt64Length())].map(
        (_, i) => new Date(Number(daily.variables(3).valuesInt64(i)) * 1000),
      ),
      sunset: [...Array(daily.variables(4).valuesInt64Length())].map(
        (_, i) => new Date(Number(daily.variables(4).valuesInt64(i)) * 1000),
      ),
    },
  };

  return weatherData;
}

function updateWeather(lat, long) {
  getWeather(lat, long).then((weather) => {
    console.log(weather);

    /* Curr weather */

    let actTemp = Math.round(weather.current.temperature_2m);
    let feelTemp = Math.round(weather.current.apparent_temperature);
    let currTemp =
      temperatureText(actTemp) +
      (actTemp === feelTemp
        ? ""
        : LONG_SPACE + FEELS_LIKE + temperatureText(feelTemp));
    let adjustedDir =
      (weather.current.wind_direction_10m + DIR_INTERVAL) % DEGREES_IN_CIRCLE;
    let windDir = DIRECTIONS[Math.floor(adjustedDir / DIR_INTERVAL)];
    let windSpeed = `${hanziNum(Math.round(weather.current.wind_speed_10m))}𣘃數𨑗𣇞`;
    setText(
      "curr-weather",
      WEATHER_CODES[weather.current.weather_code] +
        LONG_SPACE +
        currTemp +
        LONG_SPACE +
        "度𣼩" +
        hanziNum(Math.round(weather.current.relative_humidity_2m)) +
        "分𤾓",
    );
    setText("wind-info", windDir + LONG_SPACE + windSpeed);

    /* Hourly weather */

    // Reset table
    let hourlyTable = document.getElementById("hourly");
    while (hourlyTable.childNodes.length > 2) {
      hourlyTable.removeChild(hourlyTable.lastChild);
    }

    // 3 sunrises/sunsets in 24 hrs is theoretically possible
    let sunrises = weather.daily.sunrise.slice(0, 3);
    let sunsets = weather.daily.sunset.slice(0, 3);

    // Set curr weather
    console.log(weather.current.weather_code);
    setText("curr-hour-weather", WEATHER_CODES[weather.current.weather_code]);
    setText("curr-hour-temp", temperatureText(actTemp));

    for (let i = 1; i < weather.hourly.time.length; ++i) {
      let date = weather.hourly.time[i];
      let sunriseSunsetText = "";

      if (
        sunrises.some(
          (sunrise, i, _) =>
            sunrise.getDay() == date.getDay() &&
            sunrise.getHours() == date.getHours(),
        )
      ) {
        sunriseSunsetText = SUNRISE;
      } else if (
        sunsets.some(
          (sunset, i, _) =>
            sunset.getDay() == date.getDay() &&
            sunset.getHours() == date.getHours(),
        )
      ) {
        sunriseSunsetText = SUNSET;
      }

      let newRow = document.createElement("tr");
      let sunriseSunsetEl = document.createElement("td");
      let headerEl = document.createElement("th");
      let weatherEl = document.createElement("td");
      let tempEl = document.createElement("td");

      sunriseSunsetEl.textContent = sunriseSunsetText;
      headerEl.textContent = hanziNum(date.getHours()) + "𣇞";
      weatherEl.textContent = WEATHER_CODES[weather.hourly.weather_code[i]];
      tempEl.textContent = temperatureText(weather.hourly.temperature_2m[i]);
      tempEl.classList.add("left-align");
      newRow.appendChild(sunriseSunsetEl);
      newRow.appendChild(headerEl);
      newRow.appendChild(weatherEl);
      newRow.appendChild(tempEl);
      hourlyTable.appendChild(newRow);
    }

    /* Daily weather */

    // Reset table
    let dailyTable = document.getElementById("daily");
    while (dailyTable.childNodes.length > 2) {
      dailyTable.removeChild(dailyTable.lastChild);
    }

    // Set current weather
    setText("today-weather", WEATHER_CODES[weather.daily.weather_code[0]]);
    setText("today-high", temperatureText(weather.daily.temperature_2m_max[0]));
    setText("today-low", temperatureText(weather.daily.temperature_2m_min[0]));

    for (let i = 1; i < weather.daily.time.length; ++i) {
      let date = weather.daily.time[i];
      let lunarDate = Lunar.fromDate(date);
      let yaoriDay = 曜日順序[date.getDay()];
      let jiaziDay = getGanZhi(date);

      let jieQiSimplified = lunarDate.getJieQi();
      let jieQi =
        jieQiSimplified in SOLAR_TERMS_TRADITIONAL
          ? SOLAR_TERMS_TRADITIONAL[jieQiSimplified]
          : jieQiSimplified;

      setText("today-solar-term", "節" + jieQi ? jieQi : "");
      let newRow = document.createElement("tr");
      let jieqiEl = document.createElement("td");
      let headerEl = document.createElement("th");
      let weatherEl = document.createElement("td");
      let highEl = document.createElement("td");
      let lowEl = document.createElement("td");

      jieqiEl.textContent = "節" + jieQi ? jieQi : "";
      headerEl.textContent = jiaziDay + LONG_SPACE + yaoriDay;
      weatherEl.textContent = WEATHER_CODES[weather.daily.weather_code[i]];
      highEl.textContent = temperatureText(weather.daily.temperature_2m_max[i]);
      lowEl.textContent = temperatureText(weather.daily.temperature_2m_min[i]);
      newRow.appendChild(jieqiEl);
      newRow.appendChild(headerEl);
      newRow.appendChild(weatherEl);
      newRow.appendChild(highEl);
      newRow.appendChild(lowEl);
      dailyTable.appendChild(newRow);
    }
  });
}

function updateDate(currDate) {
  let lunarDate = Lunar.fromDate(currDate);
  let temp = solar2lunar(
    currDate.getDate(),
    currDate.getMonth(),
    currDate.getFullYear(),
    currDate.getTimezoneOffset() / 60,
  );
  setText(
    "lunar-date",
    lunarDateToNom(temp) +
      LONG_SPACE +
      getGanZhi(currDate) +
      (temp[0] == 15 ? "𦝃𣎃" + hanziNum(temp[1]) : "") +
      (LUNAR_HOLIDAYS.get([temp[0], temp[1]])
        ? LUNAR_HOLIDAYS.has([temp[0], temp[1]])
        : ""),
  );
  let dayOfWeek = "";
  if (currDate.getDay() == 0) {
    dayOfWeek = "主日";
  } else {
    dayOfWeek = "次" + 曜日順序[currDate.getDay()];
  }
  let yearDisplay = "";
  if (
    _.isEmpty(
      _.xor(PRESIDENT_BDAY, [currDate.getDate(), currDate.getMonth() + 1]),
    )
  ) {
    yearDisplay =
      "𢆥" +
      PRESIDENT +
      "次" +
      hanziNum(currDate.getFullYear() - PRESIDENT_FIRST_YEAR + 1) ? currDate.getFullYear() != PRESIDENT_FIRST_YEAR : PRESIDENT + "元年";
  } else {
    yearDisplay = YEAR + hanziNum(currDate.getFullYear());
  }
  setText(
    "western-date",
    hanziNum(currDate.getHours()) +
      "𣇞" +
      hanziNum(currDate.getMinutes()) +
      "𤼵" +
      hanziNum(currDate.getSeconds()) +
      "𣆰" +
      "<br>" +
      dayOfWeek +
      LONG_SPACE +
      DAY +
      hanziNum(currDate.getDate()) +
      MONTH +
      hanziNum(currDate.getMonth() + 1) +
      yearDisplay + (
        SOLAR_HOLIDAYS.get([currDate.getDate(), currDate.getMonth() + 1])
          ? SOLAR_HOLIDAYS.has([currDate.getDate(), currDate.getMonth() + 1])
          : ""
      ),
  );

  let jieQiSimplified = lunarDate.getPrevJieQi().getName();
  let jieQi =
    jieQiSimplified in SOLAR_TERMS_TRADITIONAL
      ? SOLAR_TERMS_TRADITIONAL[jieQiSimplified]
      : jieQiSimplified;

  setText("curr-jieqi", "節" + jieQi);
}

navigator.geolocation.getCurrentPosition((position) => {
  updateWeather(position.coords.latitude, position.coords.longitude);
});

function updateEverything() {
  navigator.geolocation.getCurrentPosition((position) => {
    updateWeather(position.coords.latitude, position.coords.longitude);
  });

  updateDate(new Date());
}
setInterval(function () {
  updateDate(new Date());
}, 1000);
setInterval(function () {
  navigator.geolocation.getCurrentPosition((position) => {
    updateWeather(position.coords.latitude, position.coords.longitude);
  });
}, 30 * 1000);
updateEverything();
