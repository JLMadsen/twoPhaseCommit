import java.io.*;
import java.net.*;

public class ClientHandler extends Thread
{
    private Socket connection;

    public ClientHandler(Socket connection)
	{
		this.connection = connection;
    }
    
    @Override
	public void run()
	{
        try
        {


            

        }
        catch (Exception e) {}
        finally 
        {
            if(connection.isConnected())
            {
                connection.close();
            }
        }
    }


}