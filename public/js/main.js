	//Make the divs a bit more dynamic by having them fade in when they come into view
	$(window).on("load",function() {
		$(window).scroll(function() {
			var windowBottom = $(this).scrollTop() + $(this).innerHeight();
			$(".fade").each(function() {
				/* Check the location of the top each desired element */
				var objectTop = $(this).offset().top;

				 /* If the element is completely within bounds of the window, fade it in */
				if (objectTop < windowBottom) { //object comes into view (scrolling down)
					if ($(this).css("opacity")==0) {
						$(this).fadeTo(500,1);
					}
				} 
			});
		}).scroll(); //invoke scroll-handler on page-load
	});


	$(document).ready(function(){
		$("#travelLink").click(function(){
			$(this).toggleClass("navClick");
		});
	});

	function valueChanged()
	{
		if($('.seasonBox').is(":checked"))   
			$(".seasonOptions").show();
		else
			$(".seasonOptions").hide();
	}

	$(function () {
		$('[data-toggle="tooltip"]').tooltip()
	})