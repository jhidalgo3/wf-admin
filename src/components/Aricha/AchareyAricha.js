import React, {Component} from 'react'
import moment from 'moment';
import {getData, getUnits, IVAL, putData} from '../shared/tools';
import { Menu, Segment, Label, Icon, Table, Loader, Button, Modal, Select, Message } from 'semantic-ui-react'
import MediaPlayer from "../Media/MediaPlayer";
import InsertApp from "../Insert/InsertApp"
import CIT from '../../CIT';

class AchareyAricha extends Component {

    state = {
        active: null,
        cit_open: false,
        insert_open: false,
        insert_button: true,
        inserting: false,
        aricha: [],
        file_data: {},
        filedata: {},
        metadata: {},
        input_id: "",
        ival: null,
        renaming: false,
        rename_button: true,
        send_button: true,
        sending: false,
        special: "backup",
        units: [],

    };

    componentDidMount() {
        let ival = setInterval(() => getData('bdika', (data) => {
                if (JSON.stringify(this.state.aricha) !== JSON.stringify(data))
                    this.setState({aricha: data})
            }), IVAL );
        this.setState({ival});
    };

    componentWillUnmount() {
        console.log("-- Trimmed unmount");
        clearInterval(this.state.ival);
    };

    selectFile = (data) => {
        console.log(":: ArichaApp - selected file: ", data);
        if (data.line) {
            // Build url for preview
            let url = 'http://wfserver.bbdomain.org';
            let path = data.original.format.filename;
            let source = `${url}${path}`;
            // Take sha for mdb fetch
            let sha1 = data.original.format.sha1;
            // Build data for insert app
            let filename = data.file_name;
            let content_type = "CLIP";
            let start_date = data.file_name.match(/\d{4}-\d{2}-\d{2}/)[0];
            let upload_type = "aricha";
            let language = data.line.language;
            this.setState({
                source,
                active: data.aricha_id,
                file_data: data,
                insert_button: !data.wfstatus.renamed,
                rename_button: data.wfstatus.wfsend,
                send_button: !data.wfstatus.renamed,
                filedata: {filename, content_type, start_date, upload_type, language}
            });
            getUnits('http://app.mdb.bbdomain.org/operations/descendant_units/' + sha1, (units) => {
                console.log(":: Trimmer - got units: ", units);
                if (units.total > 0)
                    console.log("The file already got unit!");
                this.setState({units});
            });
        } else {
            console.log(":: ArichaApp - file must be renamed");
            // Build url for preview
            let url = 'http://wfserver.bbdomain.org';
            let path = data.original.format.filename;
            let source = `${url}${path}`;
            this.setState({
                source,
                active: data.aricha_id,
                file_data: data,
                insert_button: !data.wfstatus.renamed,
                rename_button: data.wfstatus.wfsend,
                send_button: !data.wfstatus.renamed,
            });
        }
    };

    getPlayer = (player) => {
        console.log(":: Trimmed - got player: ", player);
        //this.setState({player: player});
    };

    openInsert = () => {
        this.setState({insert_open: true});
    };

    onInsert = (data) => {
        console.log(":: Got insert data: ", data);
        this.setState({insert_open: false});
        this.setMeta(data);
    };

    setMeta = (insert_data) => {
        let file_data = this.state.file_data;
        file_data.parent = {id: insert_data.send_id, name: insert_data.line.send_name};
        file_data.line.uid = insert_data.line.uid;
        file_data.line.mime_type = "video/mp4";
        file_data.wfstatus.wfsend = true;
        this.setState({...file_data, inserting: true, insert_button: true });
        setTimeout(() => this.setState({ inserting: false, insert_button: false, send_button: false}), 2000);
        putData(`http://wfdb.bbdomain.org:8080/aricha/${file_data.aricha_id}`, file_data, (cb) => {
            console.log(":: PUT Respond: ",cb);
        });
        //Make insert meta
        insert_data.insert_id = "i"+moment().format('X');
        insert_data.line = file_data.line;
        insert_data.date = moment().format("YYYY-MM-DD");
        insert_data.file_name = file_data.file_name;
        insert_data.extension = "mp4";
        insert_data.insert_name = `${file_data.file_name}.${insert_data.extension}`;
        insert_data.insert_type = "1";
        insert_data.language = file_data.line.language;
        insert_data.send_id = file_data.aricha_id;
        insert_data.upload_type = "aricha";
        insert_data.sha1 = file_data.original.format.sha1;
        insert_data.size = parseInt(file_data.original.format.size, 10);
        // Now we put metadata to mdb on backend
        putData(`http://wfserver.bbdomain.org:8010/workflow/insert`, insert_data, (cb) => {
            console.log(":: ArichaApp - workflow respond: ",cb);
        });
    };

    onComplete = (newline) => {
        console.log(":: Cit callback: ", newline);
        let file_data = this.state.file_data;
        let newfile_name = newline.final_name;
        let oldfile_name = file_data.file_name;
        let opath = `/backup/aricha/${newfile_name}_${file_data.aricha_id}o.mp4`;
        //let ppath = `/backup/trimmed/${file_data.date}/${newfile_name}_${file_data.aricha_id}p.mp4`;
        file_data.line = {...newline};
        file_data.parent.file_name = oldfile_name;
        //file_data.line.title = this.state.tags[newline.pattern] || "";
        file_data.original.format.filename = opath;
        //file_data.proxy.format.filename = ppath;
        file_data.file_name = newfile_name;
        file_data.wfstatus.renamed = true;
        // Build url for preview
        let url = 'http://wfserver.bbdomain.org';
        let path = file_data.original.format.filename;
        let source = `${url}${path}`;
        console.log(":: Old Meta: ", this.state.file_data+" :: New Meta: ",file_data);
        this.setState({...file_data, source, upload_filename: oldfile_name, cit_open: false, insert_button: true, renaming: true});
        setTimeout(() => this.setState({ renaming: false, insert_button: false}), 2000);
        putData(`http://wfdb.bbdomain.org:8080/aricha/${file_data.aricha_id}`, file_data, (cb) => {
            console.log(":: PUT Respond: ",cb);
            // FIXME: When API change this must be error recovering
            fetch(`http://wfserver.bbdomain.org:8080/hooks/rename?oldname=${oldfile_name}&newname=${newfile_name}&id=${file_data.aricha_id}`);
        });
    };

    openCit = () => {
        this.setState({cit_open: true});
    };

    onCancel = () => {
        this.setState({cit_open: false, insert_open: false});
    };

    setSpecial = (e, data) => {
        console.log(":: Selected send options: ", data.value);
        let special = data.value;
        this.setState({special});
    };

    sendFile = () => {
        let file_data = this.state.file_data;
        let special = this.state.special;
        console.log(":: Going to send File: ", file_data + " : to: ", special);
        fetch(`http://wfdb.bbdomain.org:8080/aricha/${file_data.aricha_id}/wfstatus/${special}?value=true`, { method: 'POST',})
        this.setState({ sending: true, send_button: true });
        setTimeout(() => {
            //fetch(`http://wfdb.bbdomain.org:8080/hooks/send?id=${file_data.aricha_id}&special=${special}`);
            this.setState({ sending: false, send_button: false });
        }, 1000);
    };

    setRemoved = () => {
        let file_data = this.state.file_data;
        console.log(":: Censor - set removed: ", file_data);
        this.setState({source: "", rename_button: true, send_button: true, insert_button: true});
        fetch(`http://wfdb.bbdomain.org:8080/aricha/${file_data.aricha_id}/wfstatus/removed?value=true`, { method: 'POST',})
    };

    render() {

        const send_options = [
            { key: 'kmedia', text: 'Kmedia', value: 'kmedia' },
            { key: 'youtube', text: 'Youtube', value: 'youtube' },
            { key: 'metus', text: 'Metus', value: 'metus' },
            { key: 'Backup', text: 'Backup', value: 'backup' },
        ];

        let v = (<Icon name='checkmark'/>);
        let x = (<Icon name='close'/>);
        let l = (<Loader size='mini' active inline />);
        let c = (<Icon name='copyright'/>);

        let aricha = this.state.aricha.map((data) => {
            const {backup,kmedia,metus,youtube,removed,wfsend,censored,checked} = data.wfstatus;
            let id = data.aricha_id;
            let ready = data.original;
            let name = ready ? data.file_name : <div>{l}&nbsp;&nbsp;&nbsp;{data.file_name}</div>;
            let time = moment.unix(id.substr(1)).format("HH:mm:ss") || "";
            if(removed) return false;
            let rowcolor = censored && !checked;
            let active = this.state.active === id ? 'active' : 'admin_raw';
            return (
                <Table.Row
                    negative={rowcolor} positive={wfsend} warning={!ready} disabled={!ready}
                    className={active} key={id} onClick={() => this.selectFile(data)}>
                    <Table.Cell>{censored ? c : ""}{name}</Table.Cell>
                    <Table.Cell>{time}</Table.Cell>
                    <Table.Cell negative={!backup}>{backup ? v : x}</Table.Cell>
                    <Table.Cell negative={!kmedia}>{kmedia ? v : x}</Table.Cell>
                    <Table.Cell negative={!youtube}>{youtube ? v : x}</Table.Cell>
                    <Table.Cell negative={!metus}>{metus ? v : x}</Table.Cell>
                </Table.Row>
            )
        });

        return (
            <Segment textAlign='center' className="ingest_segment" color='brown' raised>
                <Label  attached='top' className="trimmed_label">
                    {this.state.file_data.file_name ? this.state.file_data.file_name : ""}
                </Label>
                <Message>
                    <Menu size='large' secondary >
                        <Menu.Item>
                            <Modal trigger={<Button color='brown' icon='play' disabled={!this.state.source} />}
                                   size='tiny'
                                   mountNode={document.getElementById("ltr-modal-mount")}>
                                <MediaPlayer player={this.getPlayer} source={this.state.source} />
                            </Modal>
                        </Menu.Item>
                        <Menu.Item>
                            <Modal closeOnDimmerClick={false}
                                   trigger={<Button color='blue' icon='tags'
                                                    loading={this.state.renaming}
                                                    disabled={this.state.rename_button}
                                                    onClick={this.openCit} />}
                                   onClose={this.onCancel}
                                   open={this.state.cit_open}
                                   closeIcon="close"
                                   mountNode={document.getElementById("cit-modal-mount")}>
                                <Modal.Content>
                                    <CIT metadata={this.state.file_data.line}
                                         onCancel={this.onCancel}
                                         onComplete={(x) => this.onComplete(x)}/>
                                </Modal.Content>
                            </Modal>
                        </Menu.Item>
                        <Menu.Menu position='left'>
                            <Menu.Item>
                                <Modal { ...this.props }
                                       trigger={<Button color='teal' icon='archive'
                                                        loading={this.state.inserting}
                                                        disabled={this.state.insert_button}
                                                        onClick={this.openInsert} />}
                                       closeOnDimmerClick={true}
                                       closeIcon={true}
                                       onClose={this.onCancel}
                                       open={this.state.insert_open}
                                       size="large"
                                       mountNode={document.getElementById("ltr-modal-mount")}
                                >
                                    <InsertApp filedata={this.state.filedata} onInsert={this.onInsert} />
                                </Modal>
                            </Menu.Item>
                            <Menu.Item>
                                <Button color='red' icon='close' onClick={this.setRemoved} />
                            </Menu.Item>
                        </Menu.Menu>
                        <Menu.Menu position='right'>
                            <Menu.Item>
                                <Select compact options={send_options} defaultValue='backup'
                                        onChange={(e,data) => this.setSpecial(e,data)} />
                            </Menu.Item>
                            <Menu.Item>
                                <Button positive icon="arrow right" disabled={this.state.send_button}
                                        onClick={this.sendFile} loading={this.state.sending} />
                            </Menu.Item>
                        </Menu.Menu>
                    </Menu>
                </Message>
                <Table selectable compact='very' basic structured className="ingest_table">
                    <Table.Header>
                        <Table.Row className='table_header'>
                            <Table.HeaderCell>File Name</Table.HeaderCell>
                            <Table.HeaderCell width={2}>Time</Table.HeaderCell>
                            <Table.HeaderCell width={1}>BA</Table.HeaderCell>
                            <Table.HeaderCell width={1}>KM</Table.HeaderCell>
                            <Table.HeaderCell width={1}>YT</Table.HeaderCell>
                            <Table.HeaderCell width={1}>ME</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {aricha}
                    </Table.Body>
                </Table>
            </Segment>
        );
    }
}

export default AchareyAricha;