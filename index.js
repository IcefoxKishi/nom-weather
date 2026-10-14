'use strict';

import { fetchWeatherApi } from "https://esm.sh/openmeteo";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_NUM_DAYS = 10;

const 天干順序 = "甲乙丙丁戊己庚辛壬癸";
const 地支順序 = "子丑寅卯辰巳午未申酉戌亥";
const 干支配數 = 60;

async function getWeather(lat, long) {
	const params = {
		latitude: lat,
		longitude: long,
		daily: ["temperature_2m_max", "temperature_2m_min"],
		hourly: ["temperature_2m", "precipitation_probability", "precipitation", "rain", "wind_speed_10m", "temperature_80m", "wind_direction_10m", "wind_gusts_10m", "is_day", "showers", "snowfall", "snow_depth"],
		current: ["temperature_2m", "relative_humidity_2m", "is_day", "apparent_temperature", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "precipitation", "rain", "showers", "snowfall"],
		timezone: "auto",
		forecast_days: FORECAST_NUM_DAYS
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
			is_day: curr.variables(2).value(),
			apparent_temperature: curr.variables(3).value(),
			wind_speed_10m: curr.variables(4).value(),
			wind_direction_10m: curr.variables(5).value(),
			wind_gusts_10m: curr.variables(6).value(),
			precipitation: curr.variables(7).value(),
			rain: curr.variables(8).value(),
			showers: curr.variables(9).value(),
			snowfall: curr.variables(10).value(),
		},
		hourly: {
			time: Array.from(
				{ length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
				(_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSec) * 1000)
			),
			temperature_2m: hourly.variables(0).valuesArray(),
			precipitation_probability: hourly.variables(1).valuesArray(),
			precipitation: hourly.variables(2).valuesArray(),
			rain: hourly.variables(3).valuesArray(),
			wind_speed_10m: hourly.variables(4).valuesArray(),
			temperature_80m: hourly.variables(5).valuesArray(),
			wind_direction_10m: hourly.variables(6).valuesArray(),
			wind_gusts_10m: hourly.variables(7).valuesArray(),
			is_day: hourly.variables(8).valuesArray(),
			showers: hourly.variables(9).valuesArray(),
			snowfall: hourly.variables(10).valuesArray(),
			snow_depth: hourly.variables(11).valuesArray(),
		},
		daily: {
			time: Array.from(
				{ length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() }, 
				(_ , i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSec) * 1000)
			),
			temperature_2m_max: daily.variables(0).valuesArray(),
			temperature_2m_min: daily.variables(1).valuesArray(),
		},
	};

	return weatherData;
}

/**
 * A sexagenary cycle index.
 * 
 * The number passed to the constructor is zero-indexed. For example,
 * normally 辛酉 is 58, but my representation of 辛酉 in this class is
 * constructed by `new 干支(57)`, and `this.天干 === 7` as well as
 * `this.地支 === 9`. This is because the majority of operations do not
 * actually involve displaying the underlying numbers and so it is
 * easier to keep the number zero-indexed.
 * 
 * If the number is `< 0` or `>= 60`, the number will be clipped into
 * the correct range so that the conversion will give the correct result.
 * 
 * `toNumber()` returns whatever was passed into the constructor, so it will
 * be one off from what a human would expect.
 */
class 干支 {
	constructor(n) {
		let m = ((n % 干支配數) + 干支配數) % 干支配數;
		this.天干 = m % 天干順序.length;
		this.地支 = m % 地支順序.length;
	}

	toNumber() {
		let tens = (this.天干 - this.地支) >> 1;
		if (tens < 0) {
			tens += 6;
		}
		return tens * 10 + this.天干;
	}

	toString() {
		return 天干順序[this.天干] + 地支順序[this.地支];
	}
}

window.onload = () => {
	console.log(getWeather(47.65558560477314, -122.31509189726451));
	console.log((new 干支(57)).toNumber())
};