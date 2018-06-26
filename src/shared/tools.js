import { mime_list, CONTENT_TYPES_MAPPINGS, MDB_LANGUAGES, DCT_OPTS} from './consts';
import moment from 'moment';
export const WFRP_BACKEND = 'http://wfrp.bbdomain.org:8080';
export const WFRP_STATE = 'http://wfrp.bbdomain.org:8000';
export const MDB_BACKEND = 'https://insert.kbb1.com/rest';
export const WFDB_BACKEND = 'http://wfdb.bbdomain.org:8080';
export const WFDB_STATE = 'http://wfdb.bbdomain.org:8000';
export const WFSRV_BACKEND = 'http://wfsrv.bbdomain.org:8010';
export const DGIMA_BACKEND = 'http://dgima.bbdomain.org:8010';
export const WFSRV_OLD_BACKEND = 'http://wfserver.bbdomain.org:8080';
export const CARBON1_BACKEND = 'http://wfconv1.bbdomain.org:8081';
export const WFWEB_SERVER = 'http://wfserver.bbdomain.org';
export const IVAL = 1000;

export const toHms = (totalSec) => {
    let hours = parseInt( totalSec / 3600 , 10) % 24;
    let minutes = parseInt( totalSec / 60 , 10) % 60;
    let seconds = (totalSec % 60).toFixed(2);
    if (seconds < 0) seconds = 0;
    return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
};

export const randomString = (len, charSet) => {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < len; i++) {
        let randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
};

// export const toSeconds = (time) => {
//     var hms = time ;
//     var a = hms.split(':');
//     var seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
//     return seconds;
// };

export const getData = (path, cb) => fetch(`${WFRP_BACKEND}/${path}`)
    .then((response) => {
        if (response.ok) {
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${path}`, ex));

export const getWFData = (id, cb) =>  {
    fetch(`${WFRP_BACKEND}/${getEndpoint(id)}/${id}`)
        .then((response) => {
            if (response.ok) {
                return response.json().then(data => cb(data));
            } else {
                return response.json().then(cb(null));
            }
        })
        .catch(ex => console.log(`get ${id}`, ex));
};

const getEndpoint = (id) => {
    if(id.match(/^t[\d]{10}$/)) return "trimmer";
    if(id.match(/^a[\d]{10}$/)) return "aricha";
    if(id.match(/^d[\d]{10}$/)) return "dgima";
    if(id.match(/^i[\d]{10}$/)) return "insert";
};

export const getUnits = (path, cb) => fetch(`${path}`)
    .then((response) => {
        if (response.ok) {
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${path}`, ex));

export const putData = (path, data, cb) => fetch(`${path}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body:  JSON.stringify(data)
})
    .then((response) => {
        if (response.ok) {
            return response.json().then(respond => cb(respond));
        }
    })
    .catch(ex => console.log("Put Data error:", ex));

export const removeData = (path, cb) => fetch(`${path}`, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
})
    .then((response) => {
        if (response.ok) {
            return response.json().then(respond => cb(respond));
        }
    })
    .catch(ex => console.log("Remove Data error:", ex));

export const getConv = (path, cb) => fetch(`${WFRP_STATE}/${path}`)
    .then((response) => {
        if (response.ok) {
            return response.json().then(data => cb(data));
        } else {
            let data = {};
            cb(data);
        }
    })
    .catch(ex => console.log(`get ${path}`, ex));

export const getStatus = (ep, cb) => {
    let url = ep === "carbon" ? CARBON1_BACKEND : WFSRV_BACKEND;
    fetch(`${url}/${ep}/status`)
        .then((response) => {
            if (response.ok) {
                return response.json().then(data => cb(data));
            }
        })
        .catch(ex => console.log(`getUpload`, ex));
}


export const getLang = (lang) => {
    return Object.keys(MDB_LANGUAGES).find(key => MDB_LANGUAGES[key] === lang);
};

export const getDCT = (val) => {
    return Object.entries(DCT_OPTS).find(i => i[1].filter(p => p === val)[0])[0];
};

export const getName = (metadata) => {
    //console.log(":: GetName - got metadata: ",metadata);
    let name = [];
    const {line,language,upload_type} = metadata;

    // Language
    name[0] = language;
    // Original
    name[1] = name[0] === line.original_language || language === "mlt" ? "o" : "t";
    // Lecturer
    name[2] = line.lecturer;
    // Date
    name[3] = line.capture_date || line.film_date;
    // Type
    name[4] = CONTENT_TYPES_MAPPINGS[line.content_type].pattern;
    // Description
    name[5] = line.send_name.split("_").slice(5).join("_");

    if(upload_type === "akladot") {
        name[4] = "akladot";
    } else if(upload_type === "tamlil") {
        name[4] = line.send_name.split("_").slice(4).join("_");
        name.splice(-1,1);
    } else if(upload_type === "kitei-makor") {
        name[4] = "kitei-makor";
    } else if(upload_type === "article") {
        name[2] = "rav";
        name[4] = "art";
        name[5] = line.upload_filename.split(".")[0].split("_").pop().replace(/([^-a-zA-Z0-9]+)/g, '').toLowerCase();
    } else if(upload_type === "publication") {
        name[2] = "rav";
        name[4] = "pub";
        name[5] = line.publisher + "_"
            + line.upload_filename.split(".")[0].split("_").pop().replace(/([^-a-zA-Z0-9]+)/g, '').toLowerCase();
    }

    return name.join("_") + '.' + mime_list[line.mime_type];
};

export const newTrimMeta = (data, mode, source) => {

    const {line,original,proxy,file_name,stop_name,wfstatus,capture_id,trim_id,parent} = data;
    let p = source.match(/^(main|backup|trimmed)$/) ? "t" : "d";
    let key_id = p === "t" ? "trim_id" : "dgima_id";
    let wfid = p + moment().format('X');
    let date = moment.unix(wfid.substr(1)).format("YYYY-MM-DD");
    let originalsha1 = original.format.sha1;
    let proxysha1 = proxy ? proxy.format.sha1 : null;
    let name = source.match(/^(cassette|trimmed)$/) ? file_name : stop_name;
    let censored = mode === "censor";
    let buffer = mode === "wfadmin";
    let secured = wfstatus.secured;
    return {date, line,
        file_name: name,
        [key_id]: wfid,
        inpoints: [],
        outpoints: [],
        parent: {
            id: source === "trimmed" ? trim_id : capture_id,
            capture_id: source === "trimmed" ? parent.capture_id : data.capture_id,
            original_sha1: originalsha1,
            proxy_sha1: proxysha1,
            file_name: name,
            source
        },
        wfstatus: {
            aricha: false,
            buffer: buffer,
            fixed: false,
            trimmed: false,
            renamed: false,
            wfsend: false,
            removed: false,
            kmedia: false,
            backup: false,
            metus: false,
            censored: censored,
            secured: secured
        }
    };

};

export const Fetcher = (path, cb) => fetch(`${MDB_BACKEND}/${path}`)
    .then((response) => {
        if (response.ok) {
            return response.json().then(data => cb(data));
        }
        throw new Error('Network response was not ok.');
    })
    .catch(ex => console.log(`get ${path}`, ex));

// export const fetchSources = cb => Fetcher('sources/', cb);
//
// export const fetchTags = cb => Fetcher('tags/', cb);

export const fetchPublishers = cb => Fetcher('publishers/', cb);

export const fetchUnits = (path, cb) => fetch(`${MDB_BACKEND}/content_units/${path}`)
    .then((response) => {
        if (response.ok) {
            //console.log("--FetchDataWithCB--");
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${path}`, ex));

export const fetchPersons = (id, cb) => fetch(`${MDB_BACKEND}/content_units/${id}/persons/`)
    .then((response) => {
        if (response.ok) {
            //console.log("--FetchPersonsName--");
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${id}`, ex));

export const insertName = (filename, key, cb) => fetch(`${WFDB_BACKEND}/insert/find?key=${key}&value=${filename}`)
    .then((response) => {
        if (response.ok) {
            //console.log("--FetchInsertName--");
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${filename}`, ex));

export const insertSha = (sha, cb) => fetch(`${MDB_BACKEND}/files/?sha1=${sha}`)
    .then((response) => {
        if (response.ok) {
            //console.log("--FetchInsertSha--");
            return response.json().then(data => cb(data));
        }
    })
    .catch(ex => console.log(`get ${sha}`, ex));

//export const fetchUnits = (path,cb) => fetcher(path, cb);

export const fetchCollections = (data,col) => {
    console.log("--FetchCollection--");
    data.data.forEach((u,i) => {
        let path = `${u.id}/collections/`;
        fetchUnits(path,cb => {
                if(cb.length === 0)
                    return;
                u["number"] = cb[0].collection.properties.number || "?";
                u["part"] = cb[0].name || "?";
                col(data)
            }
        )
    })
};


