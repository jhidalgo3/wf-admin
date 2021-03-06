import React, {Component} from 'react'
import moment from 'moment';
import {
    getData,
    getUnits,
    IVAL,
    MDB_FINDSHA,
    putData,
    WFDB_BACKEND,
    WFSRV_BACKEND
} from '../../shared/tools';
import { Menu, Segment, Label, Icon, Table, Loader, Button, Modal, Select, Message } from 'semantic-ui-react'
import MediaPlayer from "../../components/Media/MediaPlayer";
import CIT from '../CIT/CIT';

class AdminTrimmed extends Component {

    state = {
        active: null,
        disabled: true,
        open: false,
        trimmed: [],
        file_data: {},
        fixReq: false,
        fix_uid: "",
        ival: null,
        sending: false,
        renaming: false,
        special: "backup",
        tags: {},
        units: [],
        units_options: [],

    };

    componentDidMount() {
        let ival = setInterval(() => getData('trim', (data) => {
                if (JSON.stringify(this.state.trimmed) !== JSON.stringify(data))
                    this.setState({trimmed: data})
            }), IVAL );
        this.setState({ival});
        getUnits('titles.json', (tags) => {
            this.setState({tags});
        });
    };

    componentWillUnmount() {
        clearInterval(this.state.ival);
    };

    selectFile = (file_data) => {
        // When polling will be disabled here must be fetch new data
        console.log(":: Trimmed - selected file: ",file_data);
        const {wfsend,fixed,buffer} = file_data.wfstatus;
        let path = file_data.proxy.format.filename;
        let source = `${WFSRV_BACKEND}${path}`;
        this.setState({file_data, source, active: file_data.trim_id, disabled: true});
        let sha1 = file_data.parent.original_sha1;
        getUnits(`${MDB_FINDSHA}/${sha1}`, (units) => {
            //FIXME: Does we need disable any action if censored=true?
            if(!wfsend && !fixed && buffer && units.total === 1) {
                console.log(":: Fix needed - unit: ", units);
                file_data.line.fix_unit_uid = units.data[0].uid;
                this.setState({ file_data, units, fixReq: true });
                this.selectFixUID(units.data[0].uid);
            } else if(!wfsend && !fixed && buffer && units.total > 1) {
                console.log(":: Fix needed - user must choose from units: ", units);
                let units_options = units.data.map((unit) => {
                    return ({ key: unit.uid, text: unit.i18n.he.name, value: unit.uid })
                });
                this.setState({units, fixReq: true, disabled: true, units_options });
            } else if(wfsend && fixed) {
                // Maybe we need indicate somehow about fixed unit
                console.log(":: Fix already done - ", units);
                this.setState({units, fixReq: false, disabled: false });
            } else if(wfsend && !fixed) {
                console.log(":: File was normally sent - ", units);
                this.setState({ units, fixReq: false, disabled: !wfsend});
            } else if(!wfsend && !buffer) {
                console.log(":: File is NOT send yet! - ", units);
            } else {
                console.log(":: What just happend? - ", units);
            }
        });
    };

    getPlayer = (player) => {
        console.log(":: Admin - got player: ", player);
        //this.setState({player: player});
    };

    openCit = () => {
        this.setState({open: true});
    };

    renameFile = (newline) => {
        console.log(":: Cit callback: ", newline);
        let {file_data} = this.state;
        let newfile_name = newline.final_name;
        let oldfile_name = file_data.file_name;
        let opath = `/backup/trimmed/${file_data.date}/${newfile_name}_${file_data.trim_id}o.mp4`;
        let ppath = `/backup/trimmed/${file_data.date}/${newfile_name}_${file_data.trim_id}p.mp4`;
        file_data.parent.file_name = oldfile_name;
        file_data.line = {...newline};
        file_data.line.title = this.state.tags[newline.pattern] || "";
        file_data.original.format.filename = opath;
        file_data.proxy.format.filename = ppath;
        file_data.file_name = newfile_name;
        file_data.wfstatus.renamed = true;
        // It's indicate that rename was done in admin mode
        file_data.wfstatus.buffer = true;
        // Following status indicate that file must be fixed
        // -->
        file_data.wfstatus.fixed = false;
        file_data.wfstatus.wfsend = false;
        // <--
        console.log(":: Old Meta: ", this.state.file_data+" :: New Meta: ",file_data);
        this.setState({open: false, renaming: true, fixReq: true, disabled: true });
        putData(`${WFSRV_BACKEND}/workflow/rename`, file_data, (cb) => {
            console.log(":: Ingest - rename respond: ",cb);
            if(cb.status === "ok") {
                setTimeout(() => this.setState({renaming: false, disabled: false }), 2000);
                this.selectFile(file_data);
            } else {
                setTimeout(() => this.setState({renaming: false, disabled: file_data.wfstatus.wfsend}), 2000);
            }
        });
    };

    onCancel = (data) => {
        console.log(":: Cit cancel: ", data);
        this.setState({open: false});
    };

    setSpecial = (special) => {
        console.log(":: Selected send options: ", special);
        this.setState({special});
    };

    selectFixUID = (uid) => {
        console.log(":: Selected fix_uid option: ", uid);
        let {file_data} = this.state;
        let fix_uid = uid;
        file_data.line.fix_unit_uid = fix_uid;
        this.setState({file_data, fix_uid, disabled: false});
        putData(`${WFDB_BACKEND}/trimmer/${file_data.trim_id}`, file_data, (cb) => {
            console.log(":: PUT Fix UID in WFDB: ",cb);
        });
    };

    sendFile = () => {
        let {file_data} = this.state;
        file_data.special = this.state.fixReq ? "fix" : this.state.special;
        this.setState({ sending: true, disabled: true });
        putData(`${WFSRV_BACKEND}/workflow/send_admin`, file_data, (cb) => {
            console.log(":: Admin - send respond: ",cb);
            //TODO: We need get here changed event from backend
            if(cb.status === "ok") {
                file_data.wfstatus[file_data.special] = true;
                setTimeout(() => this.setState({file_data, sending: false, disabled: false, fixReq: false}), 2000);
            } else {
                setTimeout(() => this.setState({sending: false, disabled: false}), 2000);
                alert("Something goes wrong!");
            }
        });

    };

    setRemoved = () => {
        let {file_data} = this.state;
        console.log(":: Admin - set removed: ", file_data);
        this.setState({ disabled: true });
        fetch(`${WFDB_BACKEND}/trimmer/${file_data.trim_id}/wfstatus/removed?value=true`, { method: 'POST',})
    };

    render() {

        let v = (<Icon name='checkmark'/>);
        let x = (<Icon name='close'/>);
        let l = (<Loader size='mini' active inline />);
        let c = (<Icon color='blue' name='copyright'/>);
        let f = (<Icon color='blue' name='configure'/>);
        let d = (<Icon color='blue' name='lock'/>);
        let s = (<Icon color='red' name='key'/>);

        const send_options = [
            { key: 'backup', text: 'Backup', value: 'backup' },
            { key: 'kmedia', text: 'Kmedia', value: 'kmedia' },
            { key: 'buffer', text: 'Buffer', value: 'buffer' },
            { key: 'airbox', text: 'AirBox', value: 'airbox' },
            { key: 'censor', text: 'Censor', value: 'censor' },
            { key: 'metus', text: 'Metus', value: 'metus' },
        ];

        let trimmed = this.state.trimmed.map((data) => {
            const {trimmed,backup,kmedia,metus,removed,wfsend,censored,checked,fixed,locked,secured} = data.wfstatus;
            let id = data.trim_id;
            let name = trimmed ? data.file_name : <div>{l}&nbsp;&nbsp;&nbsp;{data.file_name}</div>;
            let time = moment.unix(id.substr(1)).format("HH:mm:ss") || "";
            if(this.props.removed && removed)
                return false;
            let rowcolor = censored && !checked;
            let active = this.state.active === id ? 'active' : 'admin_raw';
            return (
                <Table.Row
                    negative={rowcolor} positive={wfsend} disabled={!trimmed || secured || locked}
                    className={active} key={id} onClick={() => this.selectFile(data)} >
                    <Table.Cell>
                        {secured ? s : ""}
                        {censored && trimmed ? c : ""}
                        {fixed ? f : ""}
                        {locked ? d : ""}
                        {name}</Table.Cell>
                    <Table.Cell>{time}</Table.Cell>
                    <Table.Cell negative={!backup} warning={backup}>{backup ? v : x}</Table.Cell>
                    <Table.Cell negative={!kmedia} warning={kmedia}>{kmedia ? v : x}</Table.Cell>
                    <Table.Cell negative={!metus} warning={metus}>{metus  ? v : x}</Table.Cell>
                </Table.Row>
            )
        });

        return (
            <Segment textAlign='center' className="ingest_segment" color='brown' raised>
                <Label attached='top' className="trimmed_label">
                    {this.state.file_data.file_name ? this.state.file_data.file_name : ""}
                </Label>
                <Message size='large'>
                    <Menu size='large' secondary>
                        <Menu.Item>
                            <Modal size='tiny'
                                   trigger={<Button color='brown' icon='play' disabled={!this.state.source} />}
                                   mountNode={document.getElementById("ltr-modal-mount")}>
                                <MediaPlayer player={this.getPlayer} source={this.state.source} type='video/mp4' />
                            </Modal>
                        </Menu.Item>
                        <Menu.Menu position='left'>
                            <Menu.Item>
                                <Modal closeOnDimmerClick={false}
                                       trigger={<Button disabled={this.state.disabled}
                                                        loading={this.state.renaming}
                                                        color='blue' icon='tags'
                                                        onClick={this.openCit} />}
                                       onClose={this.onCancel} open={this.state.open} closeIcon="close"
                                       mountNode={document.getElementById("cit-modal-mount")}>
                                    <Modal.Content>
                                        <CIT metadata={this.state.file_data.line}
                                             onCancel={this.onCancel}
                                             onComplete={(x) => this.renameFile(x)}/>
                                    </Modal.Content>
                                </Modal>
                            </Menu.Item>
                            <Menu.Item>
                                <Button color='red' icon='close' onClick={this.setRemoved} />
                            </Menu.Item>
                        </Menu.Menu>
                        <Menu.Menu position='right'>
                            <Menu.Item>
                                {this.state.fixReq ? "" :
                                    <Select compact options={send_options}
                                            defaultValue={this.state.special}
                                            placeholder='Send options'
                                            onChange={(e, {value}) => this.setSpecial(value)} />}
                                {this.state.fixReq && this.state.units.total > 1 ?
                                    <Select placeholder='Choose UID' options={this.state.units_options}
                                            onChange={(e, {value}) => this.selectFixUID(value)} /> : ""}
                            </Menu.Item>
                            <Menu.Item>
                                <Button positive disabled={this.state.disabled}
                                        onClick={this.sendFile} loading={this.state.sending}
                                        icon={this.state.fixReq ? "configure" : "arrow right"}/>
                            </Menu.Item>
                        </Menu.Menu>
                    </Menu>
                </Message>
                <Table selectable compact='very' basic structured className="admin_table">
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
                        {trimmed}
                    </Table.Body>
                </Table>
            </Segment>
        );
    }
}

export default AdminTrimmed;