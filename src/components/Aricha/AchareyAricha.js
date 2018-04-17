import React, {Component} from 'react'
import moment from 'moment';
import {getData, getUnits, IVAL, putData} from '../shared/tools';
import { Menu, Segment, Label, Icon, Table, Loader, Button, Modal, Input, Select, Message } from 'semantic-ui-react'
import MediaPlayer from "../Media/MediaPlayer";
import InsertApp from "../Insert/InsertApp"
//import CIT from '../../CIT';

class AchareyAricha extends Component {

    state = {
        active: null,
        disabled: true,
        open: false,
        aricha: [],
        file_data: {},
        input_id: "",
        ival: null,
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
        console.log(":: Trimmed - selected file: ",data);
        let url = 'http://wfserver.bbdomain.org';
        let path = data.proxy.format.filename;
        let source = `${url}${path}`;
        this.setState({source, active: data.aricha_id, file_data: data, disabled: true});
        let sha1 = data.original.format.sha1;
        getUnits('http://app.mdb.bbdomain.org/operations/descendant_units/'+sha1, (units) => {
            console.log(":: Trimmer - got units: ", units);
            if(units.total > 0)
                console.log("The file already got unit!");
            //this.setState({ units: units, disabled: false});
            this.setState({ units: units, disabled: !data.wfstatus.wfsend});
        });
    };

    getPlayer = (player) => {
        console.log(":: Trimmed - got player: ", player);
        //this.setState({player: player});
    };

    openInsert = () => {
        this.setState({open: true});
    };

    onComplete = (newline) => {
        console.log(":: Cit callback: ", newline);
        let file_data = this.state.file_data;
        let newfile_name = newline.final_name;
        let oldfile_name = file_data.file_name;
        let opath = `/backup/trimmed/${file_data.date}/${newfile_name}_${file_data.aricha_id}o.mp4`;
        let ppath = `/backup/trimmed/${file_data.date}/${newfile_name}_${file_data.aricha_id}p.mp4`;
        file_data.line = newline;
        file_data.line.title = this.state.tags[newline.pattern] || "";
        file_data.original.format.filename = opath;
        file_data.proxy.format.filename = ppath;
        file_data.file_name = newfile_name;
        file_data.wfstatus.renamed = true;
        console.log(":: Old Meta: ", this.state.file_data+" :: New Meta: ",file_data);
        this.setState({...file_data, open: false});
        // putData(`http://wfdb.bbdomain.org:8080/trimmer/${file_data.aricha_id}`, file_data, (cb) => {
        //     console.log(":: PUT Respond: ",cb);
        //     // FIXME: When API change this must be error recovering
        //     fetch(`http://wfdb.bbdomain.org:8080/hooks/rename?oldname=${oldfile_name}&newname=${newfile_name}&id=${file_data.aricha_id}`);
        // });
    };

    onCancel = (data) => {
        console.log(":: Cit cancel: ", data);
        this.setState({open: false});
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
        fetch(`http://wfdb.bbdomain.org:8080/trimmer/${file_data.aricha_id}/wfstatus/${special}?value=true`, { method: 'POST',})
        this.setState({ sending: true, disabled: true });
        setTimeout(() => {
            //fetch(`http://wfdb.bbdomain.org:8080/hooks/send?id=${file_data.aricha_id}&special=${special}`);
            this.setState({ sending: false });
        }, 1000);
    };

    setRemoved = () => {
        let file_data = this.state.file_data;
        console.log(":: Censor - set removed: ", file_data);
        this.setState({ disabled: true });
        fetch(`http://wfdb.bbdomain.org:8080/trimmer/${file_data.aricha_id}/wfstatus/removed?value=true`, { method: 'POST',})
    };

    recoverRemoved = () => {
        let id = this.state.input_id;
        console.log(":: Censor - going rocover id: ", id);
        this.setState({ disabled: true });
        fetch(`http://wfdb.bbdomain.org:8080/trimmer/${id}/wfstatus/removed?value=false`, { method: 'POST',})
    };

    render() {

        const send_options = [
            { key: 'backup', text: 'Backup', value: 'backup' },
            { key: 'kmedia', text: 'Kmedia', value: 'kmedia' },
            { key: 'buffer', text: 'Buffer', value: 'buffer' },
            { key: 'airbox', text: 'AirBox', value: 'airbox' },
            { key: 'censor', text: 'Censor', value: 'censor' },
            { key: 'metus', text: 'Metus', value: 'metus' },
            //{ key: 'fix', text: 'Fix', value: 'fix' },
        ];

        let aricha = this.state.aricha.map((data) => {
            let name = (data.wfstatus.aricha) ? data.file_name : <div><Loader size='mini' active inline />&nbsp;&nbsp;&nbsp;{data.file_name}</div>;
            let censor = (data.wfstatus.censored) ? <Icon name='copyright'/> : "";
            let time = moment.unix(data.aricha_id.substr(1)).format("HH:mm:ss") || "";
            //let removed = data.wfstatus.removed ? <Icon name='checkmark'/> : <Icon name='close'/>;
            if(this.props.removed && data.wfstatus.removed)
                return;
            let renamed = data.wfstatus.renamed ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let backup = data.wfstatus.backup ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let kmedia = data.wfstatus.kmedia ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let metus = data.wfstatus.metus ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let checked = data.wfstatus.checked ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let buffer = data.wfstatus.buffer ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let wfsend = data.wfstatus.wfsend ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let rowcolor = data.wfstatus.censored && !data.wfstatus.checked;
            let active = this.state.active === data.aricha_id ? 'active' : '';
            return (
                <Table.Row
                    negative={rowcolor}
                    positive={data.wfstatus.wfsend}
                    warning={!data.wfstatus.aricha}
                    className={active} key={data.aricha_id} onClick={() => this.selectFile(data) }
                >
                    <Table.Cell>{censor}{name}</Table.Cell>
                    <Table.Cell>{time}</Table.Cell>
                    <Table.Cell negative={!data.wfstatus.backup}>{backup}</Table.Cell>
                    <Table.Cell negative={!data.wfstatus.kmedia}>{kmedia}</Table.Cell>
                    <Table.Cell negative={!data.wfstatus.metus}>{metus}</Table.Cell>
                </Table.Row>
            )
        });

        return (
            <Segment textAlign='center' className="ingest_segment" color='brown' raised>
                <Label color='grey' attached='top' size='large'> {this.state.file_data.file_name ? this.state.file_data.file_name : "Trimmed Files:"} </Label>
                <Message>
                <Menu size='mini' secondary >
                    <Menu.Item>
                        <Modal trigger={<Button disabled={this.state.disabled} ><Icon name='play' /></Button>} size='tiny' mountNode={document.getElementById("ltr-modal-mount")}>
                            <MediaPlayer player={this.getPlayer} source={this.state.source} />
                        </Modal>
                    </Menu.Item>
                    <Menu.Menu position='left'>
                        <Menu.Item>
                            <Modal { ...this.props }
                                   trigger={<Button disabled={false} color='blue' onClick={this.openInsert} >Insert</Button>}
                                   closeOnDimmerClick={true}
                                   closeIcon={true}
                                   onClose={this.onCancel}
                                   open={this.state.open}
                                   size="large"
                                   mountNode={document.getElementById("ltr-modal-mount")}
                            >
                                <InsertApp { ...this.state } onComplete={this.onComplete} />
                            </Modal>
                        </Menu.Item>
                        <Menu.Item>
                            <Button color='red' onClick={this.setRemoved} >Remove</Button>
                        </Menu.Item>
                        <Menu.Item>
                            <Input className='input_idrecover' placeholder='Put ID here...' onChange={e => this.setState({input_id: e.target.value})} />
                            <Button color='teal' icon onClick={this.recoverRemoved} ><Icon name='history' /></Button>
                        </Menu.Item>
                    </Menu.Menu>
                    <Menu.Menu position='right'>
                        <Menu.Item>
                            <Select options={send_options} defaultValue='backup' onChange={(e,data) => this.setSpecial(e,data)} />
                        </Menu.Item>
                        <Menu.Item>
                            <Button positive disabled={this.state.disabled} onClick={this.sendFile} loading={this.state.sending}>Send</Button>
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