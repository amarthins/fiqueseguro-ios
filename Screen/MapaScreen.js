import React, { useState, useEffect, useRef, useContext } from 'react'
import { View, Text, StatusBar, ActivityIndicator, ScrollView, Modal, Dimensions, ImageBackground, Image, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from '../src/styles'
import { MaterialCommunityIcons, Ionicons, FontAwesome, FontAwesomeIcon, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import config from '../src/config'
import MapView, { Marker, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'
import MapViewDirections from 'react-native-maps-directions'
import * as Location from 'expo-location'
import { AuthContext } from '../src/contexts/auth'
import firebase from '../src/components/Firebase'
import NetInfo from '@react-native-community/netinfo'

let { width, height } = Dimensions.get("window");

const MapaScreen = ({ navigation, route }) => {

    const [iconSize, setIconSize] = useState(height < 600 ? 35 : 40)

    const { getSituacao, _getNearPoint } = useContext(AuthContext)

    const [situacao, setSituacao] = useState(null)
    const [color1, setColor1] = useState("#FFF")
    const [color2, setColor2] = useState("#FFF")
    const [color3, setColor3] = useState("#FFF")
    const [btnColor, setBtnColor] = useState('#888')
    const [strokeColor, setStrokeColor] = useState('#F00')
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(true)
    const [permissao, setPermissao] = useState(false)

    const [modalPermission, setModalPermission] = useState(false)

    const [origin, setOrigin] = useState(null)
    const [destination, setDestination] = useState(null)
    const [mapType, setMapType] = useState('satellite')
    const [msgError, setMsgError] = useState(null)
    const [isOnline, setIsOnline] = useState(true)

    const mapStyle = [
        {
            "featureType": "administrative",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#444444"
                }
            ]
        },
        {
            "featureType": "administrative.neighborhood",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "visibility": "on"
                },
                {
                    "hue": "#2aff00"
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#f2f2f2"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "all",
            "stylers": [
                {
                    "saturation": -100
                },
                {
                    "lightness": 45
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "simplified"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#46bcec"
                },
                {
                    "visibility": "on"
                }
            ]
        }
    ]

    const GOOGLE_MAPS_APIKEY = config.googleApi
    const mapEl = useRef(null)

    const observer = firebase.firestore().collection('barragens').onSnapshot(querySnapshot => {
        querySnapshot.docChanges().forEach(change => {
            const dados = change.doc.data()
            setSituacao(change.doc.data().status)
        })
    })

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
            if (isOnline !== state.isConnected) {
                setIsOnline(!!state.isConnected && !!state.isInternetReachable)
            }
        });
    }, [])
    NetInfo.addEventListener(state => {
        if (isOnline !== state.isConnected) {
            setIsOnline(!!state.isConnected && !!state.isInternetReachable)
        }
    })

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {

            const atual = await getLocationAsync()

            if (atual) {
                setPermissao(true)
                let latIni = parseFloat(atual.coords.latitude)
                let longIni = parseFloat(atual.coords.longitude)

                //latIni = -8.761944
                //longIni = -63.903889

                setOrigin({
                    latitude: latIni,
                    longitude: longIni,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                })

                if (isOnline) {
                    const nearPoint = await _getNearPoint(latIni, longIni)

                    setDestination({
                        latitude: parseFloat(nearPoint.latitude),
                        longitude: parseFloat(nearPoint.longitude),
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                        ponto: nearPoint.local,
                        distancia: nearPoint.distancia
                    })

                }
            }

            if (isOnline) {
                const statusSituacao = await getSituacao()
                setSituacao(statusSituacao)

                setShowModal(false)
                setLoading(false)

            } else {
                corOnline(null)

                setShowModal(false)
                setLoading(false)
            }

            height < 600 ? setIconSize(35) : setIconSize(40)
        })
        return unsubscribe
    })

    useEffect(() => {
        (async () => {
            if (isOnline) {
                const situation = await getSituacao()
                await corOnline(situation)
                setSituacao(situation)
            } else {
                await corOnline(null)
                setShowModal(false)
            }
        })()
    }, [isOnline])

    useEffect(() => {
        corOnline(situacao)
    }, [situacao])

    const corOnline = async (situation) => {
        if (isOnline) {
            if (situation === 'normal') {
                setColor1('#178C2C')
                setColor2('#00FF00')
                setColor3('#1eb53a')
                setBtnColor('#178C2C')
            } else if (situation === 'emergência') {
                setColor1('#CA0000')
                setColor2('#FF0000')
                setColor3('#FF2B2B')
                setBtnColor('#CA0000')
            } else if (situation === 'simulação') {
                setColor1('#3b5998')
                setColor2('#4661EB')
                setColor3('#4c669f')
                setBtnColor('#3b5998')
            }

        } else {
            setColor1('#FFF')
            setColor2('#FFF')
            setColor3('#FFF')
            setBtnColor('#888')
        }
        return true
    }

    const getLocationAsync = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync()
        if (status === 'granted') {
            const timeout = 3000;
            return new Promise(async (resolve, reject) => {
                setTimeout(() => { reject(new Error(`Erro ao receber posição GPS após ${(timeout * 2) / 1000} s`)) }, timeout * 2);
                setTimeout(async () => { resolve(await Location.getLastKnownPositionAsync()) }, timeout)
                resolve(await Location.getCurrentPositionAsync())
            })

        } else {
            setMsgError('A Permissão para visualizar a localização foi negada!')
            alert('A Permissão para visualizar a localização foi negada!\nO mapa não pode ser exibido.')
            return false
        }
    }

    const changeMapType = async () => {
        if (mapType === 'standard') {
            setMapType('satellite')
            setStrokeColor('#F00')
        } else {
            setMapType('standard')
            setStrokeColor('#00CCCC')
        }
    }

    if (loading || !permissao || !isOnline) {
        return (
            <SafeAreaView style={{ backgroundColor: color1, flex: 1 }}>
                <StatusBar backgroundColor={btnColor} />
                <Modal
                    visible={showModal}
                    animationType="fade"
                    onRequestClose={() => setShowModal(false)}
                    transparent={true}>
                    <View style={styles.modal}>
                        <View style={styles.innerModalSearch}>
                            <View style={styles.modalContentSearch}>
                                <ActivityIndicator size="large" />
                                <Text style={styles.textoSearchModal}>Buscando o
                                    <Text style={{ color: 'green' }}> Ponto de Encontro </Text>
                                    mais próximo. Por favor, aguarde.</Text>
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={modalPermission}
                    animationType="fade"
                    onRequestClose={() => setModalPermission(false)}
                    transparent={true}>
                    <View style={styles.modalPermission}>
                        <View style={styles.innerModalPermission}>
                            <View style={[styles.modalContentSearch, { minWidth: '90%' }]}>
                                <Text style={styles.textoSearchModal}>
                                    <Text style={{ color: 'green' }}>A Santo Antônio Energia</Text> acessa a
                                    sua localização apenas para encontrar um ponto de encontro mais próximo
                                    de você mesmo quando o aplicativo estiver fechado ou não em uso.
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.btnGrant}
                                onPress={() => setModalPermission(false)}
                            >
                                <Text style={styles.texto14White}>CONCORDAR E FECHAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <LinearGradient style={{ flex: 1 }} colors={[color1, color2, color3]} >
                    {!isOnline && <View style={styles.linhaRede}>
                        <Text style={styles.textoRede}>Você não está conectado a internet!{'\n'}
                            As informações sobre a situação da Barragem Santo Antônio e os endereços dos pontos de
                            encontro não podem ser visualizados corretamente!</Text>
                    </View>}
                    <View style={styles.wrapperMap}>
                        <Image source={require('../src/assets/mapa.jpg')} />
                    </View>

                    <View style={styles.blocoFooter}>
                        <View style={styles.wrapperFooter}>
                            <View style={styles.blocoTabs}>
                                <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                                    <FontAwesome name="home" size={iconSize} color="#333" />
                                </TouchableOpacity>
                                <TouchableOpacity>
                                    <FontAwesome5 name="map-marked-alt" size={iconSize} color={btnColor} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigation.navigate('InfoScreen')}>
                                    <FontAwesome name="info-circle" size={iconSize} color="#333" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={{ backgroundColor: color1, flex: 1 }}>
            <LinearGradient style={{ flex: 1 }} colors={[color1, color2, color3]} >

                <View style={styles.wrapperMap}>
                    <TouchableOpacity
                        onPress={() => changeMapType()}
                        style={styles.btnMapType}
                    >
                        <FontAwesome5 name="layer-group" size={25} color="#333" />
                    </TouchableOpacity>

                    <MapView
                        style={styles.mapa}
                        scrollEnabled={true}
                        initialRegion={origin}
                        showsUserLocation={true}
                        zoomEnabled={true}
                        loadingEnabled={false}
                        ref={mapEl}
                        mapType={mapType}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={mapStyle}
                    >
                        <Marker
                            coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}
                            title={'Você está aqui'}
                        >
                            <Image source={require('../src/assets/here.png')} style={{ width: 40, height: 40 }} />
                        </Marker>
                        {destination &&
                            <Marker
                                coordinate={{ latitude: destination.latitude, longitude: destination.longitude }}
                                title={destination.ponto + '\n' + destination.distancia}
                            >
                                <Image source={require('../src/assets/destination.png')} style={{ width: 40, height: 40 }} />
                            </Marker>}
                        {destination &&
                            <MapViewDirections
                                origin={origin}
                                destination={destination}
                                apikey={GOOGLE_MAPS_APIKEY}
                                strokeWidth={3}
                                strokeColor={strokeColor}
                                mode="WALKING"
                                language={"pt-BR"}
                                onReady={result => {
                                    mapEl.current.fitToCoordinates(
                                        result.coordinates, {
                                        edgePadding: {
                                            right: (width / 10),
                                            bottom: (height / 10),
                                            left: (width / 10),
                                            top: (height / 10)
                                        }
                                    })
                                }}
                            />
                        }
                    </MapView>
                </View>

                <View style={styles.blocoFooter}>
                    <View style={styles.wrapperFooter}>
                        <View style={styles.blocoTabs}>
                            <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                                <FontAwesome name="home" size={40} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <FontAwesome5 name="map-marked-alt" size={40} color={btnColor} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('InfoScreen')}>
                                <FontAwesome name="info-circle" size={40} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

            </LinearGradient>
        </SafeAreaView>
    )
}
export default MapaScreen