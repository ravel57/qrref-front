// Локализация сайта: язык определяется автоматически по настройкам браузера (navigator.languages).
// Поддерживаются русский и английский; если среди предпочитаемых языков нет русского и английского — английский.
// Для проверки язык можно принудительно задать в адресе: ?lang=en или ?lang=ru.

const messages = {
	ru: {
		darkTheme: 'Темная тема',
		modeReceive: 'Прием на это устройство',
		modeSend: 'Отправка с этого устройства',

		hostAutoOpen: 'Авто переход по ссылке',
		hostOffline: 'Нет соединения с сервером (WebSocket): текст и файлы не придут.',
		hostReceivedText: 'Полученный текст',
		hostQrHint: 'Отсканируйте этот QR-код другим устройством: ему будет предложено отправить сюда текст или файл либо начать чат.',
		hostResetKey: 'Сбросить ключ',

		chatOffline: 'Нет соединения с сервером в реальном времени (WebSocket): входящие сообщения могут не приходить.',
		chatTitle: 'Чат',
		chatLinked: 'устройства связаны',
		chatClose: 'Закрыть чат',
		chatDownload: 'скачать',
		chatEmpty: 'Сообщений пока нет. Файлы можно перетащить сюда.',
		chatMessage: 'Сообщение',
		chatPlaceholder: 'Введите сообщение… (Enter — отправить, Shift+Enter — новая строка)',
		chatUploading: 'Отправка файла «{name}»… {percent}%',
		chatAttach: 'Прикрепить файл',
		chatSend: 'Отправить',
		chatErrSend: 'Не удалось отправить сообщение',
		chatErrClose: 'Не удалось закрыть чат',
		chatErrFile: 'Не удалось отправить файл «{name}»',

		unitB: 'Б',
		unitKb: 'КБ',
		unitMb: 'МБ',
		unitGb: 'ГБ',

		scanHint: 'Наведите камеру на QR-код устройства',
		scanSecondHint: 'Отсканируйте QR-код второго компьютера',
		back: 'Назад',
		qrScanned: 'QR-код отсканирован',
		optSend: 'Отправить текст/файл',
		optChat: 'Начать чат',
		optChatOther: 'Начать чат с другим компьютером (режим обмена)',
		rescan: 'Сканировать другой QR',
		tabText: 'Текст',
		tabFile: 'Файл',
		textLabel: 'Текст для пересылки',
		textPlaceholder: 'Введите сообщение…',
		fileLabel: 'Файл для пересылки',
		send: 'Отправить',
		sent: 'Отправлено.',
		errNotQr: 'Это не QR-код qrRef (нет параметра key).',
		errSameQr: 'Это тот же QR. Нужен QR второго компьютера.',
		errSameDevice: 'Это QR-код этого же устройства.',
		errChat: 'Не удалось начать чат.',
		errPair: 'Не удалось связать компьютеры.',
		errSend: 'Не удалось отправить.',
		paired: 'Компьютеры связаны: у обоих открылся чат.',

		camDenied: 'Нужно разрешить доступ к камере.',
		camNone: 'На этом устройстве нет камеры.',
		camSecure: 'Нужен защищённый контекст (HTTPS или localhost).',
		camBusy: 'Камера уже используется другим приложением.',
		camConstraints: 'Подходящая камера не найдена.',
		camNoStream: 'Браузер не поддерживает работу с камерой.',
		camInsecure: 'Доступ к камере возможен только по HTTPS или на localhost.',
		camOther: 'Ошибка камеры ({name}).',
	},

	en: {
		darkTheme: 'Dark theme',
		modeReceive: 'Receive on this device',
		modeSend: 'Send from this device',

		hostAutoOpen: 'Open links automatically',
		hostOffline: 'No connection to the server (WebSocket): text and files won\'t arrive.',
		hostReceivedText: 'Received text',
		hostQrHint: 'Scan this QR code with another device: it will be offered to send text or a file here, or to start a chat.',
		hostResetKey: 'Reset key',

		chatOffline: 'No real-time connection to the server (WebSocket): incoming messages may not arrive.',
		chatTitle: 'Chat',
		chatLinked: 'devices linked',
		chatClose: 'Close chat',
		chatDownload: 'download',
		chatEmpty: 'No messages yet. You can drag files here.',
		chatMessage: 'Message',
		chatPlaceholder: 'Type a message… (Enter to send, Shift+Enter for a new line)',
		chatUploading: 'Sending file “{name}”… {percent}%',
		chatAttach: 'Attach file',
		chatSend: 'Send',
		chatErrSend: 'Couldn\'t send the message',
		chatErrClose: 'Couldn\'t close the chat',
		chatErrFile: 'Couldn\'t send the file “{name}”',

		unitB: 'B',
		unitKb: 'KB',
		unitMb: 'MB',
		unitGb: 'GB',

		scanHint: 'Point the camera at the device\'s QR code',
		scanSecondHint: 'Scan the second computer\'s QR code',
		back: 'Back',
		qrScanned: 'QR code scanned',
		optSend: 'Send text/file',
		optChat: 'Start chat',
		optChatOther: 'Start chat with another computer (exchange mode)',
		rescan: 'Scan another QR',
		tabText: 'Text',
		tabFile: 'File',
		textLabel: 'Text to send',
		textPlaceholder: 'Type a message…',
		fileLabel: 'File to send',
		send: 'Send',
		sent: 'Sent.',
		errNotQr: 'This is not a qrRef QR code (no key parameter).',
		errSameQr: 'Same QR scanned. The second computer\'s QR is needed.',
		errSameDevice: 'This is this device\'s own QR code.',
		errChat: 'Couldn\'t start the chat.',
		errPair: 'Couldn\'t link the computers.',
		errSend: 'Couldn\'t send.',
		paired: 'Computers linked: the chat opened on both.',

		camDenied: 'Camera access must be allowed.',
		camNone: 'This device has no camera.',
		camSecure: 'A secure context is required (HTTPS or localhost).',
		camBusy: 'The camera is already in use by another app.',
		camConstraints: 'No suitable camera found.',
		camNoStream: 'This browser doesn\'t support camera access.',
		camInsecure: 'Camera access is only possible over HTTPS or on localhost.',
		camOther: 'Camera error ({name}).',
	},
}

const SUPPORTED = Object.keys(messages)

/** Первый из предпочитаемых браузером языков, который мы умеем показывать; иначе английский. */
export function detectLanguage(preferred = navigator.languages?.length ? navigator.languages : [navigator.language]) {
	for (const raw of preferred || []) {
		const code = String(raw || '').toLowerCase().split('-')[0]
		if (SUPPORTED.includes(code)) return code
	}
	return 'en'
}

function initialLanguage() {
	const forced = new URLSearchParams(window.location.search).get('lang')
	return SUPPORTED.includes(forced) ? forced : detectLanguage()
}

export const language = initialLanguage()
document.documentElement.lang = language

/** Перевод по ключу; {name} в тексте заменяется значением из params. Неизвестный ключ возвращается как есть. */
export function t(key, params = {}) {
	const text = messages[language][key] ?? messages.en[key] ?? key
	return text.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`))
}

export default {
	install(app) {
		app.config.globalProperties.$t = t
	},
}
