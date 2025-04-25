export default function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        try {
       
            return decodeURIComponent(parts.pop().split(';').shift());
        } catch (e) {
            console.error("Error decoding cookie:", name, e);
            return null; 
        }
    }
    return null; 
}