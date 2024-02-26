import React, { createContext, useState, useEffect } from 'react'
import { navigation, useNavigation } from '@react-navigation/native'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import config from '../../src/config'
import moment from 'moment'
import firebase from '../../src/components/Firebase'
import { collection, addDoc } from "firebase/firestore"
import * as SQLite from "expo-sqlite"
const db = SQLite.openDatabase("homologa1.db")
import NetInfo from '@react-native-community/netinfo'


export const AuthContext = createContext({})

function AuthProvider({ children }) {

    const [rede, setRede] = useState(true)

    NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityTest: async (response) => response.status === 204,
        reachabilityLongTimeout: 30 * 1000,
        reachabilityShortTimeout: 5 * 1000,
        reachabilityRequestTimeout: 15 * 1000,
        reachabilityShouldRun: () => true,
        shouldFetchWiFiSSID: true,
        useNativeReachability: false
    })
    useEffect(() => {
        NetInfo.fetch().then(state => {
            //setRede(false)
            if (rede !== state.isConnected) {
                setRede(!!state.isConnected && !!state.isInternetReachable)
            }
        });
    }, [])
    NetInfo.addEventListener(state => {
        //setRede(false)
        if (rede !== state.isConnected) {
            setRede(!!state.isConnected && !!state.isInternetReachable)
        }
    })

    const GOOGLE_MAPS_APIKEY = config.googleApi

    const navigation = useNavigation()

    const [user, setUser] = useState(null)
    const [token, setToken] = useState(false)
    const [authorization, setAuthorization] = useState(false)

    const status = firebase.firestore().collection('barragens')

    async function signOut() {
        setUser(null)
    }

    const retornaMsgSql = async () => {
        await _createSql()

        const lastId = await _getMsgSql()

        return lastId
    }

    const getSituacao = async () => {
        return new Promise((resolve, reject) => {
            status
                .doc('SANTO-ANTONIO')
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        resolve(doc.data()['status']);
                    } else {
                        resolve(null);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        })
    }

    async function signIn() {
        const cria = await _createSql()
        const acesso = await _getAcessoToken()

        if (typeof acesso[0] !== 'undefined') {
            const authorizationToken = await getAuthToken(acesso[0])
            await removeValue('@authorization')
            if (authorizationToken) {
                await storeObject('@authorization', authorizationToken)
            }
            setToken(acesso[0].token)
        } else {
            if (rede) {
                setToken(false)
            } else {
                setToken('prov656988')
            }
        }
        return token
    }

    const getAuthToken = async (expoPushToken) => {
        let form_data = JSON.stringify({ data: expoPushToken.data, token: expoPushToken.token, id: expoPushToken.id })

        let response = await fetch(config.site_url + '/webservice/api/retrieve-auth-token/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: form_data
        });
        let json = await response.json()

        if (json.status === 200) {
            await storeObject('@authorization', json.authToken)
            setAuthorization(json.authToken)
            return json.authToken
        } else {
            removeValue('@authorization')
            setAuthorization(null)
            return false
        }
    }

    const getInfos = async () => {
        const infoSql = await _getInformacoesSql()

        if (rede) {
            const informes = await getInfoSys()
            if (typeof infoSql[0] == 'undefined') {
                await Promise.all(
                    informes.dados.map(async (vlr) => {
                        let dados = {
                            titulo: vlr.titulo,
                            tipo: vlr.tipo,
                            texto: vlr.texto,
                            short: vlr.short,
                            timestamp: vlr.timestamp,
                            size: vlr.size
                        }
                        await _insereInfoSql(dados)
                    })
                )
                return informes.dados

            } else {
                let saida = []
                await Promise.all(
                    informes.dados.map(async (vlr) => {
                        infoSql.map(async (elemento) => {
                            if (vlr.tipo == elemento.tipo) {
                                if (elemento.timestamp != vlr.timestamp) {
                                    saida.push(vlr)
                                    await _updateInfoSql(vlr)
                                } else {
                                    saida.push(elemento)
                                }
                            }
                        })
                    })
                )
                return saida
            }

        } else {
            return infoSql
        }

    }

    const _updateInfoSql = async (dados) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "UPDATE informacoes SET titulo =?,tipo =?,texto =?, short =?, timestamp =?  WHERE id =?",
                    [dados.titulo, dados.tipo, dados.texto, dados.short, dados.timestamp, dados.id],
                    (tx, results) => {
                        resolve(dados.id)
                    },
                    (tx, err) => {
                        console.error(err)
                        reject(err)
                    }
                )
            })
        })
    }

    const getInfoSys = async () => {
        let response = await fetch(config.site_url + '/webservice/api/retorna-informacoes/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        let json = await response.json()
        return json
    }

    const _getInformacoesSql = async () => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT * FROM informacoes",
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao verificar mensagens");
                        reject(err);
                    }
                )
            })
        })
    }

    const _getAcessoToken = async () => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT * FROM expotoken",
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao verificar tokens");
                        reject(err);
                    }
                )
            })
        })
    }

    const updateLocations = async () => {
        if (rede) {
            const pontosSys = await getPontosSys()
            const pontosSql = await _getPontosSql()

            await Promise.all(
                pontosSys.dados.map(async (vlr) => {
                    let timestampSys = vlr.timestamp
                    let timestampSql = ''
                    if (pontosSql.length > 0) {
                        pontosSql.map(async (elemento) => {
                            if (vlr.id === elemento.id) {
                                if (vlr.timestamp !== elemento.timestamp || vlr.posicao !== elemento.posicao) {
                                    await _updatePontoSql(vlr)
                                }
                            }
                        })
                    } else {
                        await _inserePontoSql(vlr)
                    }
                })
            )
        }

        return true
    }

    const _updatePontoSql = async (valores) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "UPDATE pontos SET nome =?, endereco =?, latitude =?, longitude =?, point_x =?, point_y =?, dados =?, timestamp =?, posicao =? WHERE id =?",
                    [valores.nome, valores.endereco, valores.latitude, valores.longitude, valores.point_x, valores.point_y, valores.dados, valores.timestamp, valores.posicao, valores.id],
                    (tx, results) => {
                        resolve(valores.id)
                    },
                    (tx, err) => {
                        console.error(err)
                        reject(err)
                    }
                )
            })
        })
    }

    const _inserePontoSql = async (valores) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "INSERT INTO pontos (id,nome,endereco,latitude,longitude,point_x,point_y,dados,timestamp,posicao) VALUES (?,?,?,?,?,?,?,?,?,?)",
                    [valores.id, valores.nome, valores.endereco, valores.latitude, valores.longitude, valores.point_x, valores.point_y, valores.dados, valores.timestamp, valores.posicao],
                    (tx, results) => {
                        resolve(results);
                    },
                    (tx, err) => {
                        console.error(err);
                        reject(err);
                    }
                )
            })
        })
    }

    const getPontosSys = async () => {
        let autorizacao = await getObject('@authorization')
        let response = await fetch(config.site_url + '/webservice/api/retorna-pontos-full/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + autorizacao
            }
        });
        let json = await response.json()
        console.log('getPontosSys',json)

        return json
    }

    const salvaToken = async (token, aceite) => {
        let form_data = JSON.stringify({ token: token, aceite: aceite })

        let response = await fetch(config.site_url + '/webservice/api/salvar-token/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: form_data
        });
        let json = await response.json()

        if (json.status === 200) {
            let date = moment().utcOffset('-03:00').format('YYYY-MM-DD HH:mm:ss')
            await _insereToken(token, date)
        }
        setToken(token)

        return true
    }

    const _getPontosSql = async () => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT * FROM pontos",
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao recuperar pontos");
                        reject(err);
                    }
                )
            })
        })
    }

    const _getNearPoint = async (latitude, longitude) => {
        const origin = latitude + ',' + longitude

        const pontos = await _getPontosSql()

        let valor = 10000000
        let ponto = {}

        await Promise.all(
            pontos.map(async (vlr) => {
                let link = 'https://maps.googleapis.com/maps/api/distancematrix/json?'
                link += 'origins=' + origin
                link += '&destinations=' + vlr.latitude + ',' + vlr.longitude
                link += '&mode=walking'
                link += '&key=' + GOOGLE_MAPS_APIKEY

                let response = await fetch(link, { method: 'GET' })
                let json = await response.json()

                if (json.status == 'OK') {

                    if (typeof json.rows[0].elements[0].distance !== 'undefined') {
                        if (valor > json.rows[0].elements[0].distance.value) {

                            ponto = {
                                ponto: vlr.nome,
                                distancia: json.rows[0].elements[0].distance.value,
                                latitude: vlr.latitude,
                                longitude: vlr.longitude,
                                duracao: json.rows[0].elements[0].duration.text,
                                local: json.destination_addresses[0]
                            }
                            valor = json.rows[0].elements[0].distance.value
                        }
                    }
                }
            })
        )

        return ponto
    }


    const _createSql = async () => {
        return new Promise((resolve, reject) => {
            db.transaction(
                (tx) => {
                    tx.executeSql(
                        "create table if not exists mensagens (id integer primary key not null,id_msg integer,titulo text,texto text,short text,data text,lido text)"
                    );
                    tx.executeSql(
                        "create table if not exists informacoes (id integer primary key not null,titulo text,tipo text,texto text,short text,timestamp text,size text)"
                    );
                    tx.executeSql(
                        "create table if not exists pontos (id integer primary key not null,nome text,endereco text,latitude text,longitude text,point_x text,point_y text,dados text,timestamp text,posicao text)"
                    );
                    tx.executeSql(
                        "create table if not exists expotoken (id integer primary key not null,token text,data text)"
                    )
                },
                null,
                resolve("criado"),
            );
        });
    }

    const _insereSql = async (dados) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "INSERT INTO mensagens (id_msg,titulo,texto,short,data,lido) VALUES (?,?,?,?,?,?)",
                    [dados.id_msg, dados.titulo, dados.texto, dados.short, dados.data, dados.lido],
                    (tx, results) => {
                        resolve(results);
                    },
                    (tx, err) => {
                        console.error(err);
                        reject(err);
                    }
                )
            })
        })
    }

    const _insereToken = async (token, data) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "INSERT INTO expotoken (token,data) VALUES (?,?)",
                    [token, data],
                    (tx, results) => {
                        resolve(results);
                    },
                    (tx, err) => {
                        console.error(err);
                        reject(err);
                    }
                )
            })
        })
    }

    const _insereInfoSql = async (dados) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "INSERT INTO informacoes (id,titulo,tipo,texto,short,timestamp,size) VALUES (?,?,?,?,?,?,?)",
                    [dados.id, dados.titulo, dados.tipo, dados.texto, dados.short, dados.timestamp, dados.size],
                    (tx, results) => {
                        resolve(results);
                    },
                    (tx, err) => {
                        console.error(err);
                        reject(err);
                    }
                )
            })
        })
    }

    const _getMensagensSys = async (id) => {
        let autorizacao = await getObject('@authorization')
        let form_data = JSON.stringify({ id: id })

        let response = await fetch(config.site_url + '/webservice/api/retorna-mensagens/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + autorizacao
            },
            body: form_data
        });
        let json = await response.json()

        return json
    }

    const _updateLido = async (id) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "UPDATE mensagens SET lido =? WHERE id =?",
                    ['S', id],
                    (tx, results) => {
                        resolve(id)
                    },
                    (tx, err) => {
                        console.error(err)
                        reject(err)
                    }
                )
            })
        })
    }

    const _getMsgSql = async () => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT * FROM mensagens ORDER BY id DESC",
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao verificar mensagens");
                        reject(err);
                    }
                )
            })
        })
    }

    const _getMsgSqlById = async (id) => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT COUNT(*) as contador FROM mensagens WHERE id_msg =?",
                    [id],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao verificar mensagens");
                        reject(err);
                    }
                )
            })
        })
    }

    const _verifyTable = async () => {
        return new Promise((resolve, reject) => {
            db.transaction((tx) => {
                tx.executeSql(
                    "SELECT count(*) as qtd FROM sqlite_master WHERE type='table' AND name='mensagens'",
                    [],
                    (_, { rows: { _array } }) => resolve(_array),
                    (tx, err) => {
                        console.log("Erro ao verificar mensagens");
                        reject(err);
                    }
                )
            })
        })
    }


    const storeObject = async (key, value) => {
        try {
            await AsyncStorage.setItem(key, JSON.stringify(value))
        } catch (e) {
            console.log(e)
        }
        return true
    }
    const getObject = async (key) => {
        try {
            const jsonValue = await AsyncStorage.getItem(key)
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.log(e)
        }
        return true
    }
    const removeValue = async (key) => {
        try {
            await AsyncStorage.removeItem(key)
        } catch (e) {
            console.log(e)
        }
        return true
    }



    return (
        <AuthContext.Provider
            value={{

                signIn,
                signOut,
                getSituacao,
                retornaMsgSql,
                _updateLido,
                getInfos,
                _verifyTable,
                updateLocations,
                _getNearPoint,
                _getMensagensSys,
                _insereSql,
                _getInformacoesSql,
                getInfoSys,
                _insereInfoSql,
                _getMsgSqlById,
                salvaToken,
                token,
                rede,
                authorization,

            }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider