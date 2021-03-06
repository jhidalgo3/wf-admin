import React, { Component } from 'react';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import 'moment/locale/he';
import 'moment/locale/ru';
import 'moment/locale/es';
import 'moment/locale/fr';
import 'moment/locale/it';
import 'moment/locale/de';
import 'moment/locale/en-gb';
import './InsertApp.css';
import { Grid, Button, Header, Modal, Dropdown, Container, Segment, Input } from 'semantic-ui-react';
import { fetchPublishers, fetchPersons, insertName, getName, getLang, getDataByID, fetchUnits, getDCT } from '../../shared/tools';
import {content_options, language_options, upload_extensions, MDB_LANGUAGES, CONTENT_TYPE_BY_ID} from '../../shared/consts';

import MdbData from './MdbData';
import NestedModal from './NestedModal';

class InsertApp extends Component {

    state = {
        metadata: {...this.props.metadata},
        unit: null,
        files: [],
        store: { sources: [], tags: [], publishers: []},
        loading: false,
        locale: "he",
        isValidated: false,
    };


    componentDidMount() {
        const {send_uid} = this.state.metadata;
        this.inputUid(send_uid);
        // Set sunday first weekday in russian
        moment.updateLocale('ru', { week: {dow: 0,},});
        moment.updateLocale('es', { week: {dow: 0,},});
        moment.updateLocale('it', { week: {dow: 0,},});
        moment.updateLocale('de', { week: {dow: 0,},});
        moment.updateLocale('fr', { week: {dow: 0,},});
        moment.updateLocale('en', { week: {dow: 0,},});
        fetchPublishers(publishers => this.setState({ store: { ...this.state.store, publishers: publishers.data } }));
    };

    componentDidUpdate(prevProps, prevState) {
        if (JSON.stringify(prevState.metadata) !== JSON.stringify(this.state.metadata))
            this.setState({ isValidated: false });
    };

    selectContentType = (content_type) => {
        let {metadata} = this.state;
        const {upload_type} = this.props.metadata;
        this.setState({metadata: {...metadata, content_type, upload_type}});
    };

    selectLanguage = (language) => {
        let {metadata} = this.state;
        this.setState({metadata: {...metadata, language}, locale: getLang(language)});
    };

    selectUpload = (upload_type) => {
        let {metadata} = this.state;
        this.setState({metadata: {...metadata,upload_type}});
    };

    selectDate = (date) => {
        let {metadata} = this.state;
        this.setState({metadata: {...metadata, date: date.format('YYYY-MM-DD')}});
    };

    onClose = () => {
        this.props.onCancel();
    };

    inputUid = (send_uid) => {
        let {metadata} = this.state;
        this.setState({metadata: {...metadata, send_uid}, isValidated: false});
        if(send_uid.length === 8) {
            fetchUnits(`?query=${send_uid}`, (data) => {
                let unit = data.data[0];
                console.log(":: Got UNIT: ", data);
                metadata.content_type = getDCT(CONTENT_TYPE_BY_ID[unit.type_id]);
                metadata.date = unit.properties.capture_date || unit.properties.film_date;
                this.setState({metadata: {...metadata, send_uid}, isValidated: false, unit});
            })
        }
    };

    setPublisher = (publisher) => {
        const {uid,pattern} = publisher;
        let {metadata} = this.state;
        metadata.line.publisher_uid = uid;
        metadata.line.publisher = pattern;
        console.log(":: Set Publisher: ", publisher);
        this.setState({metadata: {...metadata}});
    };

    onGetUID = (unit) => {
        console.log(":: Selected unit: ", unit);
        this.setState({unit});
        let {metadata} = this.state;
        const {properties, uid, type_id, id} = unit;

        // Does rename mean shiuh lo nahon?
        // if(metadata.line.uid === uid && metadata.insert_type === "3") {
        //     console.log(":: This UID: "+uid+" - already slected!");
        //     alert("This UID: "+uid+" - already slected!");
        //     this.setState({ isValidated: false });
        //     return
        // }

        // Check if all Required meta is selected
        const {content_type, language, upload_type} = metadata;
        if (!content_type || !language || !upload_type) {
            console.log(":: Required meta not selected! ::");
            this.setState({ isValidated: false });
            return
        } else {
            this.setState({ isValidated: true });
        }

        // Meta from unit properties going to line
        metadata.line.uid = uid;
        metadata.line.content_type = CONTENT_TYPE_BY_ID[type_id];
        metadata.line.capture_date = properties.capture_date;
        metadata.line.film_date = properties.film_date;
        metadata.line.original_language = MDB_LANGUAGES[properties.original_language];
        metadata.send_id = properties.workflow_id || null;
        const wfid = metadata.send_id;
        wfid ? this.newUnitWF(metadata, wfid) : this.oldUnitWF(metadata, id);
    };

    newUnitWF = (metadata, wfid) => {
        console.log(":::: New Workflow UNIT :::: ");
        console.log(":: Workflow ID: ", wfid);
        getDataByID(wfid, (wfdata) => {
            if(wfdata) {
                console.log(":: Got Workflow Data: ", wfdata);
                metadata.line.send_name = wfdata.file_name;
                metadata.line.lecturer = wfdata.line.lecturer;
                if(metadata.upload_type !== "aricha")
                    metadata.insert_name = getName(metadata);
                console.log(":: Metadata insert_name: \n%c" + metadata.insert_name, "color:Green");
                this.checkMeta(metadata);
            } else {
                alert("Something goes wrong :(");
                this.setState({ isValidated: false });
            }
        });
    };

    oldUnitWF = (metadata, id) => {
        console.log(":::: Old Workflow UNIT :::: ");
        metadata.line.send_name = metadata.line.upload_filename.split('.')[0];
        fetchPersons(id, (data) => {
            console.log(":: Got Persons: ",data);
            metadata.line.lecturer = (data.length > 0 && data[0].person.uid === "abcdefgh") ? "rav" : "norav";
            metadata.insert_name = getName(metadata);
            console.log(":: Metadata insert_name: \n%c"+metadata.insert_name,"color:Green");
            this.checkMeta(metadata);
        });
    };

    checkMeta = (metadata) => {
        console.log(":: checkMeta - metadata: ", metadata);
        const {insert_type, insert_name, upload_type} = metadata;
        [metadata.file_name, metadata.extension] = metadata.insert_name.split('.');

        // Check upload type extension
        let ext = upload_extensions[upload_type].filter(ext => ext === metadata.extension);
        if (ext.length === 0) {
            alert("Extension: " + metadata.extension + " - is NOT valid for upload type - " + upload_type);
            this.setState({ isValidated: false });
            return
        }

        // Check valid string
        if(insert_name.length < 30) {
            alert("Something wrong in file name building");
            this.setState({ isValidated: false });
            return
        }

        // Check if name already exist
        insertName(insert_name, "insert_name", (data) => {
            console.log(":: insertName - got: ",data);
            if(data.length > 0 && insert_type === "1") {
                console.log(":: File with name: "+insert_name+" - already exist!");
                alert("File with name: "+insert_name+" - already exist!");
                this.setState({ isValidated: false });
            } else if(data.length === 0 && insert_type === "2") {
                console.log(":: File with name: "+insert_name+" - does NOT exist! In current mode the operation must be update only");
                alert("File with name: "+insert_name+" - does NOT exist! In current mode the operation must be update only");
                this.setState({ isValidated: false });
            } else {
                this.setState({metadata: { ...metadata }});
            }
        });
    };

    onComplete = () => {
        this.setState({ isValidated: false, loading: true });
        let {metadata} = this.state;
        delete metadata.send_uid;
        delete metadata.content_type;
        console.log(" ::: onComplete metadata ::: ", metadata);
        this.props.onComplete(metadata);
    };

    render() {

        const {filename} = this.props.filedata;
        const {metadata, isValidated, loading, locale, unit} = this.state;
        const {date,upload_type,content_type,language,insert_type,send_uid} = metadata;

        let date_picker = (
            <DatePicker
                className="datepickercs"
                locale={locale}
                dateFormat="YYYY-MM-DD"
                showYearDropdown
                showMonthDropdown
                scrollableYearDropdown
                maxDate={moment()}
                openToDate={moment(date)}
                selected={moment(date)}
                onChange={this.selectDate}
            />
        );

        let uid_input = (
            <Input
                error={false}
                className="input_uid"
                size="mini"
                icon='barcode'
                placeholder="UID"
                iconPosition='left'
                value={send_uid}
                onChange={(e,{value}) => this.inputUid(value)}
            />
        );

        let update_style = (<style>{'.ui.clearing.segment { background-color: #f9e7db; }'}</style>);
        let rename_style = (<style>{'.ui.clearing.segment { background-color: #e6aaaa; }'}</style>);

        const upload_options = [
            { value: 'akladot', text: ' ‏הקלדות', icon: 'file word outline', disabled: content_type === "ARTICLES" },
            { value: 'tamlil', text: 'תמליל', icon: 'indent', disabled: content_type === "ARTICLES" },
            { value: 'kitei-makor', text: 'קיטעי-מקור', icon: 'copyright', disabled: content_type === "ARTICLES" },
            { value: 'sirtutim', text: ' ‏שרטוטים', icon: 'edit', disabled: content_type === "ARTICLES" },
            { value: 'dibuv', text: 'דיבוב', icon: 'translate', disabled: content_type === "ARTICLES" },
            { value: 'aricha', text: ' עריכה', icon: 'paint brush', disabled: true},
            { value: 'article', text: 'מאמרים ', icon: 'newspaper', disabled: content_type !== "ARTICLES" },
            { value: 'publication', text: 'פירסומים ', icon: 'announcement', disabled: content_type !== "ARTICLES" },
        ];

        return (
            <Container className="insert_app">
                <Segment clearing>
                    {insert_type === "2" ? update_style : ""}
                    {insert_type === "3" ? rename_style : ""}
                    <Header floated='left' >
                        <Dropdown
                            error={!content_type}
                            disabled={content_type === "ARTICLE"}
                            className="large"
                            placeholder="Content:"
                            selection
                            options={content_options}
                            content_type={content_type}
                            onChange={(e,{value}) => this.selectContentType(value)}
                            value={content_type} >
                        </Dropdown>
                        <Dropdown
                            error={!language}
                            className="large"
                            placeholder="Language:"
                            selection
                            options={language_options}
                            language={language}
                            onChange={(e,{value}) => this.selectLanguage(value)}
                            value={language} >
                        </Dropdown>
                        <Dropdown
                            className="large"
                            error={!upload_type}
                            disabled={this.props.metadata.upload_type !== "" || content_type === ""}
                            placeholder="Upload Type:"
                            selection
                            options={upload_options}
                            upload_type={upload_type}
                            onChange={(e,{value}) => this.selectUpload(value)}
                            value={upload_type}
                        />
                    </Header>
                    <Header floated='right'>
                        {uid_input}
                    </Header>
                        {date_picker}
                </Segment>
                <Segment clearing secondary color='blue'>
                <Modal.Content className="tabContent">
                    <MdbData metadata={metadata} units={[unit]} onUidSelect={this.onGetUID} />
                </Modal.Content>
                </Segment>
                <Segment clearing tertiary color='yellow'>
                <Modal.Actions>
                    <Grid columns='equal'>
                        <Grid.Column width={12}>
                            <Input
                                disabled
                                fluid
                                icon='file'
                                iconPosition='left'
                                focus={true}
                                value={filename}
                            />
                        </Grid.Column>
                        <Grid.Column>
                            <Button
                                fluid
                                color='green'
                                disabled={!isValidated}
                                loading={loading}
                                onClick={this.onComplete} >Send
                            </Button>
                        </Grid.Column>
                    </Grid>
                    <NestedModal
                        upload_type={upload_type}
                        publishers={this.state.store.publishers}
                        onUidSelect={this.onGetUID}
                        onPubSelect={this.setPublisher}
                    />
                </Modal.Actions>
                </Segment>
            </Container>
        );
    }
}

export default InsertApp;
