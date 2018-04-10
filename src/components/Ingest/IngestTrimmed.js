import React, {Component, Fragment} from 'react'
import moment from 'moment';
import {getData, getUnits, IVAL} from '../shared/tools';
import { Menu, Segment, Label, Icon, Table, Loader, Button, Modal, Message } from 'semantic-ui-react'
import MediaPlayer from "../Media/MediaPlayer";
import CIT from '../../CIT';

class IngestTrimmed extends Component {

    state = {
        active: null,
        open: false,
        trimmed: [],
        file_data: {},
        ival: null,
        units: [],

    };

    componentDidMount() {
            let ival = setInterval(() => getData('trim', (data) => {
                    if (JSON.stringify(this.state.trimmed) !== JSON.stringify(data))
                        this.setState({trimmed: data})
                }), 1000
            );
        this.setState({ival: ival});
    };

    componentWillUnmount() {
        console.log("-- Ingest unmount");
        clearInterval(this.state.ival);
    };

    handleClick = (data) => {
        console.log(":: Selected trim: ",data);
        let url = 'http://10.66.1.122';
        let path = data.proxy.format.filename;
        let source = `${url}${path}`;
        this.setState({source});
        let sha1 = data.original.format.sha1;
        getUnits('http://app.mdb.bbdomain.org/operations/descendant_units/'+sha1, (units) => {
            console.log(":: Trimmer - got units: ", units);
            this.setState({active: data.trim_id, file_data: data, units: units});
        });
    };

    getPlayer = (player) => {
        console.log(":: Trimmed - got player: ", player);
        //this.setState({player: player});
    };

    renameFile = () => {
        this.setState({open: true});
    };

    onComplete = (data) => {
        console.log(":: Cit back: ", data);
        this.setState({open: false})
    };

    onCancel = (data) => {
        console.log(":: Cit cansel: ", data);
        this.setState({open: false});
    };

    render() {

        const { activeItem } = this.state

        let trimmed = this.state.trimmed.map((data) => {
            let name = (data.wfstatus.trimmed) ? data.file_name : <div><Loader size='mini' active inline></Loader>&nbsp;&nbsp;&nbsp;{data.file_name}</div>;
            let censor = (data.wfstatus.censored) ? <Icon name='copyright'/> : "";
            let time = moment.unix(data.trim_id.substr(1)).format("HH:mm:ss") || "";
            //let removed = data.wfstatus.removed ? <Icon name='checkmark'/> : <Icon name='close'/>;
            if(this.props.removed && data.wfstatus.removed)
                return;
            let renamed = data.wfstatus.renamed ? <Icon name='checkmark'/> : <Icon name='close'/>;
            //let checked = data.wfstatus.checked ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let buffer = data.wfstatus.buffer ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let wfsend = data.wfstatus.wfsend ? <Icon name='checkmark'/> : <Icon name='close'/>;
            let rowcolor = data.wfstatus.censored && !data.wfstatus.checked;
            let active = this.state.active === data.trim_id ? 'active' : '';
            return (
                <Table.Row
                    negative={rowcolor}
                    positive={data.wfstatus.wfsend}
                    warning={!data.wfstatus.trimmed}
                    className={active} key={data.trim_id} onClick={() => this.handleClick(data)}
                >
                    <Table.Cell>{censor}{name}</Table.Cell>
                    <Table.Cell>{time}</Table.Cell>
                    <Table.Cell>{renamed}</Table.Cell>
                    <Table.Cell>{buffer}</Table.Cell>
                    <Table.Cell negative={!data.wfstatus.wfsend}>{wfsend}</Table.Cell>
                </Table.Row>
            )
        });

        return (

                <Segment textAlign='center' className="ingest_segment" color='brown'>
                    <Label attached='top' size='large'> {this.state.file_data.file_name} </Label>
                    <Menu size='mini' secondary>
                        <Menu.Item>
                            <Modal trigger={<Button><Icon name='play' /></Button>} size='tiny'>
                                <MediaPlayer player={this.getPlayer} source={this.state.source} />
                            </Modal>
                        </Menu.Item>
                        <Menu.Menu position='left'>
                            <Menu.Item>
                                <Modal trigger={<Button color='blue' onClick={this.renameFile} >Rename</Button>} open={this.state.open} closeIcon="close">
                                    <Modal.Content>
                                        <CIT metadata={this.state.file_data.line} onCancel={this.onCancel} onComplete={(x) => this.onComplete(x)}/>
                                    </Modal.Content>
                                </Modal>
                            </Menu.Item>
                        </Menu.Menu>
                        <Menu.Menu position='right'>
                            <Menu.Item>
                                <Button positive>Send</Button>
                            </Menu.Item>
                        </Menu.Menu>
                    </Menu>
                <Table selectable compact='very' basic structured className="ingest_table">
                    <Table.Header>
                        <Table.Row className='table_header'>
                            <Table.HeaderCell>File Name</Table.HeaderCell>
                            <Table.HeaderCell width={2}>Time</Table.HeaderCell>
                            <Table.HeaderCell width={1}>RNM</Table.HeaderCell>
                            <Table.HeaderCell width={1}>BUF</Table.HeaderCell>
                            <Table.HeaderCell width={1}>SND</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {trimmed}
                    </Table.Body>
                </Table>
                </Segment>
        );
    }
}

export default IngestTrimmed;