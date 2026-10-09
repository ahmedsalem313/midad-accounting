import m from 'arabic-reshaper'
const pkg = m.default || m
console.log('Keys:', Object.keys(pkg))
console.log('has reshape:', typeof pkg.reshape)
console.log('has default:', !!pkg.default)
console.log('Type of m:', typeof m)
console.log('m keys:', Object.keys(m))
