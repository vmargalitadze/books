const track = document.getElementById("tickerTrack");
const items = [...track.children];

items.forEach((item, index) => {
    let speed = 250; 
    let x = track.offsetWidth + (index * 180); 

    function move() {
        x -= 1; 
        item.style.transform = `translateX(${x}px)`;


        if (x < -item.offsetWidth) {
            x = track.offsetWidth;
        }
        requestAnimationFrame(move);
    }

    move();
});

// slider

let slideIndex = 1;
showSlides(slideIndex);

function plusSlides(n) {
  showSlides(slideIndex += n);
}

function currentSlide(n) {
  showSlides(slideIndex = n);
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  let dots = document.getElementsByClassName("dot");
  if (n > slides.length) {slideIndex = 1}    
  if (n < 1) {slideIndex = slides.length}
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";  
  }
  for (i = 0; i < dots.length; i++) {
    dots[i].className = dots[i].className.replace(" active", "");
  }
  slides[slideIndex-1].style.display = "block";  
  dots[slideIndex-1].className += " active";
}