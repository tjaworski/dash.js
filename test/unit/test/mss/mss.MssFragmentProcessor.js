import MssFragmentProcessor from '../../../../src/mss/MssFragmentProcessor.js';
import PlaybackController from '../../../../src/streaming/controllers/PlaybackController.js';
import EventBus from '../../../../src/core/EventBus.js';
import MssErrors from '../../../../src/mss/errors/MssErrors.js';
import Constants from '../../../../src/streaming/constants/Constants.js';
import ErrorHandlerMock from '../../mocks/ErrorHandlerMock.js';
import StreamProcessorMock from '../../mocks/StreamProcessorMock.js';
import DashMetricsMock from '../../mocks/DashMetricsMock.js';
import DebugMock from '../../mocks/DebugMock.js';
import ISOBoxer from 'codem-isoboxer';
import FileLoader from '../../helpers/FileLoader.js';
import {expect} from 'chai';

const context = {};
const playbackController = PlaybackController(context).getInstance();
const eventBus = EventBus(context).getInstance();
const errorHandlerMock = new ErrorHandlerMock();
const dashMetricsMock = new DashMetricsMock();
const mssFragmentProcessor = MssFragmentProcessor(context).create({
    playbackController: playbackController,
    eventBus: eventBus,
    ISOBoxer: ISOBoxer,
    errHandler: errorHandlerMock,
    dashMetrics: dashMetricsMock,
    debug: new DebugMock(),
    constants: Constants
});

describe('MssFragmentProcessor', function () {
    const testType = 'video';
    const streamInfo = {
        id: 'id'
    };
    const streamProcessorMock = new StreamProcessorMock(testType, streamInfo);

    afterEach(function () {
        errorHandlerMock.reset();
    });

    it('should throw an exception when attempting to call processFragment and e is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor)).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.request is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, {})).to.throw('e parameter is missing or malformed');
    });

    it('should throw an exception when attempting to call processFragment and e.response is undefined', () => {
        expect(mssFragmentProcessor.processFragment.bind(mssFragmentProcessor, { request: { type: 'MediaSegment' } })).to.throw('e parameter is missing or malformed');
    });

    it('should throw an error when attempting to call processFragment for mp4 media live segment without tfrf box', async () => {
        const arrayBuffer = await FileLoader.loadArrayBufferFile('/data/mss/mss_moof_tfdt.mp4');
        const e = {
            request: { type: 'MediaSegment', representation: { mediaInfo: { index: 0 } } },
            response: arrayBuffer
        };
        mssFragmentProcessor.processFragment(e, streamProcessorMock);
        expect(errorHandlerMock.errorValue).to.equal(MssErrors.MSS_NO_TFRF_MESSAGE);
        expect(errorHandlerMock.errorCode).to.equal(MssErrors.MSS_NO_TFRF_CODE);
    });

    it('should not throw an error when attempting to call processFragment for mp4 media live segment with tfrf box', async () => {
        const arrayBuffer = await FileLoader.loadArrayBufferFile('/data/mss/mss_moof.mp4');
        const e = {
            request: { type: 'MediaSegment', representation: { mediaInfo: { index: 0 } } },
            response: arrayBuffer
        };
        mssFragmentProcessor.processFragment(e, streamProcessorMock);
        expect(errorHandlerMock.errorValue).not.to.equal(MssErrors.MSS_NO_TFRF_MESSAGE);
        expect(errorHandlerMock.errorCode).not.to.equal(MssErrors.MSS_NO_TFRF_CODE);
    });

    it('should throw an error when attempting to call generateMoov for audio mp4 initialization segment', () => {
        const rep = {
            BaseURL: undefined,
            SegmentTemplate: {
                media: 'QualityLevels($Bandwidth$)/Fragments(audio=$Time$)',
                timescale: 10000000,
                SegmentTimeline: {}
            },
            audioChannels: NaN,
            audioSamplingRate: NaN,
            bandwidth: 64000,
            codecPrivateData: '1000',
            codecs: 'mp7a.58.2',
            height: NaN,
            id: 'audio_0',
            mimeType: 'audio/mp4',
            width: NaN,
            adaptation: {
                period: {
                    mpd: { manifest: { Period: [{ AdaptationSet: [{ SegmentTemplate: { timescale: 0 } }] }] } },
                    index: 0
                },
                index: 0,
                type: 'audio'
            }
        };
        expect(mssFragmentProcessor.generateMoov.bind(mssFragmentProcessor, rep)).to.throw({
            name: 'Unsupported codec',
            message: 'Unsupported codec',
            data: {}
        });
    });

    it('should not throw an error when attempting to call generateMoov for audio mp4 initialization segment', () => {
        const rep = {
            BaseURL: undefined,
            SegmentTemplate: {
                media: 'QualityLevels($Bandwidth$)/Fragments(audio=$Time$)',
                timescale: 10000000,
                SegmentTimeline: {}
            },
            audioChannels: NaN,
            audioSamplingRate: NaN,
            bandwidth: 64000,
            codecPrivateData: '1000',
            codecs: 'mp4a.58.2',
            height: NaN,
            id: 'audio_0',
            mimeType: 'audio/mp4',
            width: NaN,
            adaptation: {
                period: {
                    mpd: { manifest: { Period: [{ AdaptationSet: [{ SegmentTemplate: { timescale: 0 } }] }] } },
                    index: 0
                }, index: 0, type: 'audio'
            }
        };
        expect(mssFragmentProcessor.generateMoov.bind(mssFragmentProcessor, rep)).to.not.throw({
            name: 'Unsupported codec',
            message: 'Unsupported codec',
            data: {}
        });
    });

    it('should throw an error when attempting to call generateMoov for video mp4 initialization segment', () => {
        const rep = {
            BaseURL: undefined,
            SegmentTemplate: {
                media: 'QualityLevels($Bandwidth$)/Fragments(video=$Time$)',
                timescale: 10000000,
                SegmentTimeline: {}
            },
            audioChannels: NaN,
            audioSamplingRate: NaN,
            bandwidth: 64000,
            codecPrivateData: '1000',
            codecs: 'avc7.4d401f',
            height: NaN,
            id: 'video_0',
            mimeType: 'video/mp4',
            width: NaN,
            adaptation: {
                period: {
                    mpd: { manifest: { Period_: [{ AdaptationSet_: [{ SegmentTemplate: { timescale: 0 } }] }] } },
                    index: 0
                }, index: 0, type: 'video'
            }
        };
        expect(mssFragmentProcessor.generateMoov.bind(mssFragmentProcessor, rep)).to.throw({
            name: 'Unsupported codec',
            message: 'Unsupported codec',
            data: {}
        });
    });

    it('should not throw an error when attempting to call generateMoov for video mp4 initialization segment', () => {
        const rep = {
            BaseURL: undefined,
            SegmentTemplate: {
                media: 'QualityLevels($Bandwidth$)/Fragments(video=$Time$)',
                timescale: 10000000,
                SegmentTimeline: {}
            },
            audioChannels: NaN,
            audioSamplingRate: NaN,
            bandwidth: 64000,
            codecPrivateData: '1000',
            codecs: 'avc1.4d401f',
            height: NaN,
            id: 'video_0',
            mimeType: 'video/mp4',
            width: NaN,
            adaptation: {
                period: {
                    mpd: { manifest: { Period: [{ AdaptationSet: [{ SegmentTemplate: { timescale: 0 } }] }] } },
                    index: 0
                }, index: 0, type: 'video'
            }
        };
        expect(mssFragmentProcessor.generateMoov.bind(mssFragmentProcessor, rep)).to.not.throw({
            name: 'Unsupported codec',
            message: 'Unsupported codec',
            data: {}
        });
    });
});
