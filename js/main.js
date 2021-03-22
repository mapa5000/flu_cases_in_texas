
      require([
        "esri/Map",
        "esri/views/MapView",
        "esri/layers/GeoJSONLayer",
        "esri/widgets/TimeSlider",
        "esri/widgets/Expand",
        "esri/widgets/Legend"
      ], function (Map, MapView, GeoJSONLayer, TimeSlider, Expand, Legend) {
        let layerView;

        const layer = new GeoJSONLayer({
          url:
            "https://raw.githubusercontent.com/marcoportillo5000/data/main/flu_texas.geojson",
          copyright: "data: MPortillo  | developed by: Marco Portillo using ArcGIS API for JavaScript",
          title: "Reported Cases of Flu in Texas",
          // set the CSVLayer's timeInfo based on the date field
          timeInfo: {
            startField: "time", // name of the date field
            interval: {
              // set time interval to one day
              unit: "days",
              value: 1
            }
          },
          renderer: {
            type: "simple",
            field: "mag",
            symbol: {
              type: "simple-marker",
              color: "orange",
              outline: null
            },
            visualVariables: [
              {
                type: "size",
                field: "mag",
                legendOptions: {
                    title: "Number of cases per day"
                  },
                stops: [
                  {
                    value: 2,
                    size: "5px"
                  },
                  {
                    value: 3,
                    size: "10"
                  },
                  {
                    value: 4,
                    size: "15"
                  }
                ]
              },
              {
                type: "color",
                field: "depth",
                legendOptions: {
                    title: "Intensity"
                  },
                stops: [
                  {
                    value: 2.5,
                    color: "#F9C653",
                    label: "low rate of cases per day"
                  },
                  {
                    value: 3.5,
                    color: "#F8864D",
                    label: "medium rate of cases per day"
                  },
                  {
                    value: 4,
                    color: "#C53C06",
                    label: "high rate of cases per day"
                  }
                ]
              }
            ]
          },
          popupTemplate: {
            title: "{title}",
            content: [
              {
                type: "fields",
                fieldInfos: [
                  {
                    fieldName: "place",
                    label: "County",
                    visible: true
                  },
                  {
                    fieldName: "title",
                    label: "Area",
                    visible: true
                  },
                  {
                    fieldName: "mag",
                    label: "Cases",
                    visible: true
                  }
                ]
              }
            ]
          }
        });

        const map = new Map({
          basemap: "dark-gray-vector",
          layers: [layer]
        });

        var view = new MapView({
          map: map,
          container: "viewDiv",
          zoom: 5,
          center: [-95.39,29.94]
        });

        // create a new time slider widget
        // set other properties when the layer view is loaded
        // by default timeSlider.mode is "time-window" - shows
        // data falls within time range
        const timeSlider = new TimeSlider({
          container: "timeSlider",
          playRate: 500,
          stops: {
            interval: {
              value: 10,
              unit: "days"
            }
          }
        });
        view.ui.add(timeSlider, "manual");

        // wait till the layer view is loaded
        view.whenLayerView(layer).then(function (lv) {
          layerView = lv;

          // start time of the time slider
          const start = new Date(2013, 5, 25);
          // set time slider's full extent to
          // until end date of layer's fullTimeExtent
          timeSlider.fullTimeExtent = {
            start: start,
            end: layer.timeInfo.fullTimeExtent.end
          };

          // We will be showing cases with 100 day interval
          
          const end = new Date(start);
          // end of current time extent for time slider
          // showing cases with 100 day interval
          end.setDate(end.getDate() + 100);

          // Values property is set so that timeslider
          // widget show the first day. We are setting
          // the thumbs positions.
          timeSlider.values = [start, end];
        });

        // watch for time slider timeExtent change
        timeSlider.watch("timeExtent", function () {
          // only show cases happened up until the end of
          // timeSlider's current time extent.
          layer.definitionExpression =
            "time <= " + timeSlider.timeExtent.end.getTime();

          // now gray out cases that happened before the time slider's current
          // timeExtent... leaving footprint of cases that already happened
          layerView.effect = {
            filter: {
              timeExtent: timeSlider.timeExtent,
              geometry: view.extent
            },
            excludedEffect: "grayscale(20%) opacity(12%)"
          };

          // run statistics on malaria cases within the current time extent
          const statQuery = layerView.effect.filter.createQuery();
          statQuery.outStatistics = [
            magMax,
            magAvg,
            magMin,
            tremorCount,
            avgDepth
          ];

          layer
            .queryFeatures(statQuery)
            .then(function (result) {
              let htmls = [];
              statsDiv.innerHTML = "";
              if (result.error) {
                return result.error;
              } else {
                if (result.features.length >= 1) {
                  var attributes = result.features[0].attributes;
                  for (name in statsFields) {
                    if (attributes[name] && attributes[name] != null) {
                      const html =
                        "<br/>" +
                        statsFields[name] +
                        ": <b><span> " +
                        attributes[name].toFixed(0) +
                        "</span></b>";
                      htmls.push(html);
                    }
                  }
                  var yearHtml =
                    "<span>" +
                    result.features[0].attributes["tremor_count"] +
                    "</span> incidences were reported between " +
                    timeSlider.timeExtent.start.toLocaleDateString() +
                    " - " +
                    timeSlider.timeExtent.end.toLocaleDateString() +
                    ".<br/>";

                  if (htmls[0] == undefined) {
                    statsDiv.innerHTML = yearHtml;
                  } else {
                    statsDiv.innerHTML =
                      yearHtml + htmls[0] + htmls[1] + htmls[2] + htmls[3];
                  }
                }
              }
            })
            .catch(function (error) {
              console.log(error);
            });
        });

        const avgDepth = {
          onStatisticField: "mag",
          outStatisticFieldName: "Average_depth",
          statisticType: "sum"
        };

        const magMax = {
          onStatisticField: "mag",
          outStatisticFieldName: "Max_magnitude",
          statisticType: "max"
        };

        const magAvg = {
          onStatisticField: "mag",
          outStatisticFieldName: "Average_magnitude",
          statisticType: "avg"
        };

        const magMin = {
          onStatisticField: "mag",
          outStatisticFieldName: "Min_magnitude",
          statisticType: "min"
        };

        const tremorCount = {
          onStatisticField: "mag",
          outStatisticFieldName: "tremor_count",
          statisticType: "count"
        };

        const statsFields = {
          Max_magnitude: "Max number of cases per day",
          Average_magnitude: "Average of cases per day",
          Min_magnitude: "Min number of cases per day",
          Average_depth: "TOTAL CASES (slider range)"
        };

        // add a legend for the earthquakes layer
        const legendExpand = new Expand({
          collapsedIconClass: "esri-icon-collapse",
          expandIconClass: "esri-icon-expand",
          expandTooltip: "Legend",
          view: view,
          content: new Legend({
            view: view
          }),
          expanded: true
        });
        view.ui.add(legendExpand, "top-left");

        const statsDiv = document.getElementById("statsDiv");
        const infoDiv = document.getElementById("infoDiv");
        const infoDivExpand = new Expand({
          collapsedIconClass: "esri-icon-collapse",
          expandIconClass: "esri-icon-expand",
          expandTooltip: "Expand malaria cases info",
          view: view,
          content: infoDiv,
          expanded: true
        });
        view.ui.add(infoDivExpand, "top-right");
      });
