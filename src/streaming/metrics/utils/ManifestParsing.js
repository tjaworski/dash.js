import Metrics from '../vo/Metrics.js';
import Range from '../vo/Range.js';
import Reporting from '../vo/Reporting.js';
import FactoryMaker from '../../../core/FactoryMaker.js';

function ManifestParsing (config) {
    config = config || {};
    let instance;
    let adapter = config.adapter;
    const constants = config.constants;

    function getMetricsRangeStartTime(manifest, dynamic, range) {
        let voPeriods,
            reportingStartTime;
        let presentationStartTime = 0;

        if (dynamic) {
            // For services with MPD@type='dynamic', the start time is
            // indicated in wall clock time by adding the value of this
            // attribute to the value of the MPD@availabilityStartTime
            // attribute.
            presentationStartTime = adapter.getAvailabilityStartTime(manifest) / 1000;
        } else {
            // For services with MPD@type='static', the start time is indicated
            // in Media Presentation time and is relative to the PeriodStart
            // time of the first Period in this MPD.
            voPeriods = adapter.getRegularPeriods(manifest);

            if (voPeriods.length) {
                presentationStartTime = voPeriods[0].start;
            }
        }

        // When not present, DASH Metrics collection is
        // requested from the beginning of content
        // consumption.
        reportingStartTime = presentationStartTime;

        if (range && range.hasOwnProperty(constants.START_TIME)) {
            reportingStartTime += range.starttime;
        }

        return reportingStartTime;
    }

    function getMetrics(manifest) {
        let metrics = [];

        if (manifest && manifest.Metrics) {
            manifest.Metrics.forEach(metric => {
                var metricEntry = new Metrics();
                var isDynamic = adapter.getIsDynamic(manifest);

                if (metric.hasOwnProperty('metrics')) {
                    metricEntry.metrics = metric.metrics;
                } else {
                    return;
                }

                if (metric.Range) {
                    metric.Range.forEach(range => {
                        var rangeEntry = new Range();

                        rangeEntry.starttime =
                            getMetricsRangeStartTime(manifest, isDynamic, range);

                        if (range.hasOwnProperty('duration')) {
                            rangeEntry.duration = range.duration;
                        } else {
                            // if not present, the value is identical to the
                            // Media Presentation duration.
                            rangeEntry.duration = adapter.getDuration(manifest);
                        }

                        rangeEntry._useWallClockTime = isDynamic;

                        metricEntry.Range.push(rangeEntry);
                    });
                }

                if (metric.Reporting) {
                    metric.Reporting.forEach(reporting => {
                        var reportingEntry = new Reporting();

                        if (reporting.hasOwnProperty(constants.SCHEME_ID_URI)) {
                            reportingEntry.schemeIdUri = reporting.schemeIdUri;
                        } else {
                            // Invalid Reporting. schemeIdUri must be set. Ignore.
                            return;
                        }

                        if (reporting.hasOwnProperty('value')) {
                            reportingEntry.value = reporting.value;
                        }

                        if (reporting.hasOwnProperty(constants.DVB_REPORTING_URL)) {
                            reportingEntry.dvbReportingUrl = reporting[constants.DVB_REPORTING_URL];
                        }

                        if (reporting.hasOwnProperty(constants.DVB_PROBABILITY)) {
                            reportingEntry.dvbProbability = reporting[constants.DVB_PROBABILITY];
                        }

                        metricEntry.Reporting.push(reportingEntry);
                    });
                } else {
                    // Invalid Metrics. At least one reporting must be present. Ignore
                    return;
                }

                metrics.push(metricEntry);
            });
        }

        return metrics;
    }

    instance = {
        getMetrics: getMetrics
    };

    return instance;
}

ManifestParsing.__dashjs_factory_name = 'ManifestParsing';
export default FactoryMaker.getSingletonFactory(ManifestParsing); /* jshint ignore:line */
