import React, { Component } from 'react'
import { getStatus, IVAL } from '../../shared/tools';
import { Table, Container, Loader } from 'semantic-ui-react'

class MonitorUpload extends Component {

    state = {
        upload: [],
        ival: null,
    };

    componentDidMount() {
        let ival = setInterval(() =>
            getStatus("upload", (data) => {
                let upload = JSON.parse(data.stdout);
                upload.splice(0,1);
                if (JSON.stringify(this.state.upload) !== JSON.stringify(data)) {
                    var wfts = [];
                    upload.forEach(function (item) {
                        var itemts = item.split(/\s+/);
                        if (itemts[1] !== undefined && itemts[1].match(/^(running|queued)$/)) {
                             var jsonts = {
                                "ID": itemts[0],
                                "State": itemts[1],
                                "Log": itemts[2],
                                "Task": JSON.parse(itemts[3].split('[')[1].split(']')[0]),
                                "Script": itemts[3],
                            };
                            wfts.push(jsonts);
                        }
                    });
                    this.setState({upload: wfts})
                }
            }), IVAL
        );
        this.setState({ival: ival});
    };


    componentWillUnmount() {
        clearInterval(this.state.ival);
    };

    render() {
        let l = (<Loader size='mini' active inline />);

        let upload_data = this.state.upload.map((data, i) => {
            const {archive_type,file_name} = data.Task;
            //let task = data.Script.split('[')[1].split(']')[0];
            //let dest = data.Arg2 || "upload";
            let state = data.State;
            let name = state === "running" ? <div>{l}&nbsp;&nbsp;&nbsp;{file_name}</div> : file_name;
            let ncolor = state === "running";
            return (
                <Table.Row key={i} warning={ncolor} className="monitor_tr">
                    <Table.Cell>{archive_type}</Table.Cell>
                    <Table.Cell>upload</Table.Cell>
                    <Table.Cell>{name}</Table.Cell>
                    <Table.Cell>{state}</Table.Cell>
                </Table.Row>
            )
        });

        return (

            <Container textAlign='center'>
                <u>Upload</u>
                <Table compact='very' basic size='small'>
                    <Table.Header>
                        <Table.Row className='table_header'>
                            <Table.HeaderCell width={2}>Dest</Table.HeaderCell>
                            <Table.HeaderCell width={2}>Task</Table.HeaderCell>
                            <Table.HeaderCell>Name</Table.HeaderCell>
                            <Table.HeaderCell width={1}>Progress</Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {upload_data}
                    </Table.Body>
                </Table>
            </Container>
        );
    }
}

export default MonitorUpload;