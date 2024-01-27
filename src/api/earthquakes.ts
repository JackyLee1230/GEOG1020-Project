/* eslint-disable prefer-const */
/* eslint-disable guard-for-in */
import axios from 'axios';
import _ from 'lodash';


const getEarthquakes = async (starttime: string, setData: any) => {
  let numByDay: { date: string, num: number; }[] = []
  let numByMag: { mag: string, num: number; }[] = []
  let numByLocation : { loc: string, num: number; }[]= []
  try {
    const response = await axios.get(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${starttime}&endtime=`
    );
    const { data } = response;

    // eslint-disable-next-line no-restricted-syntax
    _.forEach(data.features , (feat: { properties: { time: string | number | Date; }; }) => {
      // get the date in unix time and convert it to JS date and then to a string
      // then for each day, count the number of earthquakes
      const date = new Date(feat.properties.time).toDateString();
      const index = numByDay.findIndex((day) => day.date === date);
      if (index === -1) {
        numByDay.push({ date, num: 1 });
      } else {
        numByDay[index].num += 1;
      }
    });


      _.forEach(data.features, (feat) => {
        const s = _.split(feat.properties.place, ',');
        const country = s[s.length - 1]; 
        if (country !== '') {
          const index = numByLocation.findIndex((loc) => loc.loc === _.replace(_.trim(country), "region", ''));
          if (index === -1) {
            numByLocation.push({ loc: _.replace(_.trim(country), "region", ''), num: 1 });
          } else {
            numByLocation[index].num += 1;
          };
        }
        numByLocation = _.sortBy(numByLocation, ['num']).reverse();
      })

      for (let i = 0; i < 10; i += 1) {
        numByMag.push({ mag: i !== 9 ? `${i}-${i + 1}` : "9+", num: 0 });
      }

    _.forEach(data.features, (feat: { properties: { mag: number; }; }) => {
      let category = 0;
      const { mag } = feat.properties;
      if (mag <= 1) category = 0;
      if (mag > 1 && mag <= 2) category = 1;
      if (mag > 2 && mag <= 3) category = 2;
      if (mag > 3 && mag <= 4) category = 3;
      if (mag > 4 && mag <= 5) category = 4;
      if (mag > 5 && mag <= 6) category = 5;
      if (mag > 6 && mag <= 7) category = 6;
      if (mag > 7 && mag <= 8) category = 7;
      if (mag > 8 && mag <= 9) category = 8;
      if (mag > 9) category = 9;

      numByMag[category].num += 1;
    }
    );
    setData([numByDay, numByMag, data.features.length, numByLocation]);

    return data;
  } catch (error) {
    console.log('error getting earthquake data', error);
    return false;
  }
};

export { getEarthquakes };
